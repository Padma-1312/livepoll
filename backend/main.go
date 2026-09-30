package main

import (
 "context"
 "encoding/json"
 "io"
 "fmt"
 "log"
 "os"
 "strings"
 "time"

 "github.com/gin-contrib/cors"
 "github.com/gin-gonic/gin"
 "github.com/golang-jwt/jwt/v5"
 "github.com/google/uuid"
 "github.com/redis/go-redis/v9"
 "go.mongodb.org/mongo-driver/bson"
 "go.mongodb.org/mongo-driver/bson/primitive"
 "go.mongodb.org/mongo-driver/mongo"
 "go.mongodb.org/mongo-driver/mongo/options"
 "golang.org/x/crypto/bcrypt"
)

type User struct { ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`; Email string `bson:"email" json:"email"`; Password string `bson:"password" json:"-"`; CreatedAt time.Time `bson:"createdAt" json:"createdAt"` }
type Poll struct { ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`; Question string `bson:"question" json:"question"`; Options []string `bson:"options" json:"options"`; CreatorID primitive.ObjectID `bson:"creatorId" json:"creatorId"`; ShareCode string `bson:"shareCode" json:"shareCode"`; CreatedAt time.Time `bson:"createdAt" json:"createdAt"` }
type Vote struct { ID primitive.ObjectID `bson:"_id,omitempty"`; PollID primitive.ObjectID `bson:"pollId"`; OptionIndex int `bson:"optionIndex"`; VoterID string `bson:"voterId"`; CreatedAt time.Time `bson:"createdAt"` }
type Claims struct { UserID string `json:"userId"`; jwt.RegisteredClaims }

var db *mongo.Database
var rdb *redis.Client
var jwtSecret []byte

func main() {
 ctx := context.Background()
 mongoURI := getenv("MONGO_URI", "mongodb://localhost:27017")
 client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI)); if err != nil { log.Fatal(err) }
 if err = client.Ping(ctx, nil); err != nil { log.Fatal("MongoDB: ", err) }
 db = client.Database(getenv("MONGO_DB", "livepoll"))
 redisURL := getenv("REDIS_URL", "")
if redisURL != "" {
    opts, err := redis.ParseURL(redisURL)
    if err != nil {
        log.Fatal("Redis URL: ", err)
    }
    rdb = redis.NewClient(opts)
} else {
    rdb = redis.NewClient(&redis.Options{Addr: getenv("REDIS_ADDR", "localhost:6379")})
}
 if err = rdb.Ping(ctx).Err(); err != nil { log.Fatal("Redis: ", err) }
 jwtSecret = []byte(getenv("JWT_SECRET", "dev-secret-change-me"))
 db.Collection("users").Indexes().CreateOne(ctx, mongo.IndexModel{Keys:bson.D{{Key:"email",Value:1}}, Options:options.Index().SetUnique(true)})

 router := gin.Default()
 router.Use(cors.New(cors.Config{AllowOrigins: []string{getenv("FRONTEND_URL", "http://localhost:5173"), "http://localhost:5173", "http://192.168.31.46:5173"}, AllowMethods: []string{"GET","POST","OPTIONS"}, AllowHeaders: []string{"Origin","Content-Type","Authorization"}, AllowCredentials: true}))
 router.GET("/api/health", func(c *gin.Context){ c.JSON(200, gin.H{"message":"LivePoll API is running"}) })
 router.POST("/api/auth/signup", signup)
 router.POST("/api/auth/login", login)
 auth := router.Group("/api"); auth.Use(requireAuth())
 auth.POST("/polls", createPoll)
 auth.GET("/polls/mine", myPolls)
 router.GET("/api/polls/:shareCode", getPoll)
 router.POST("/api/polls/:shareCode/vote", vote)
 router.GET("/api/polls/:shareCode/events", events)

 port:=getenv("PORT","8080"); log.Printf("API listening on :%s",port); log.Fatal(router.Run(":"+port))
}

func signup(c *gin.Context){ var in struct{Email,Password string}; if c.ShouldBindJSON(&in)!=nil || !validEmail(in.Email) || len(in.Password)<6 { c.JSON(400,gin.H{"error":"Valid email and password (6+ characters) required"}); return }; in.Email=strings.ToLower(strings.TrimSpace(in.Email)); h,_:=bcrypt.GenerateFromPassword([]byte(in.Password),bcrypt.DefaultCost); u:=User{Email:in.Email,Password:string(h),CreatedAt:time.Now()}; res,err:=db.Collection("users").InsertOne(c,u); if err!=nil { c.JSON(409,gin.H{"error":"Email already registered"}); return }; id:=res.InsertedID.(primitive.ObjectID); token,_:=makeToken(id); c.JSON(201,gin.H{"token":token}) }
func login(c *gin.Context){ var in struct{Email,Password string}; if c.ShouldBindJSON(&in)!=nil { c.JSON(400,gin.H{"error":"Invalid request"}); return }; var u User; err:=db.Collection("users").FindOne(c,bson.M{"email":strings.ToLower(strings.TrimSpace(in.Email))}).Decode(&u); if err!=nil || bcrypt.CompareHashAndPassword([]byte(u.Password),[]byte(in.Password))!=nil { c.JSON(401,gin.H{"error":"Invalid email or password"}); return }; token,_:=makeToken(u.ID); c.JSON(200,gin.H{"token":token}) }
func createPoll(c *gin.Context){ var in struct{Question string `json:"question"`; Options []string `json:"options"`}; if c.ShouldBindJSON(&in)!=nil { c.JSON(400,gin.H{"error":"Invalid JSON"}); return }; in.Question=strings.TrimSpace(in.Question); clean:=[]string{}; for _,o:=range in.Options { o=strings.TrimSpace(o); if o!="" { clean=append(clean,o) } }; if len(in.Question)<3 || len(in.Question)>200 || len(clean)<2 || len(clean)>6 { c.JSON(400,gin.H{"error":"Question must be 3-200 chars and poll needs 2-6 options"}); return }; uid,_:=primitive.ObjectIDFromHex(c.GetString("userId")); p:=Poll{Question:in.Question,Options:clean,CreatorID:uid,ShareCode:uuid.NewString()[:8],CreatedAt:time.Now()}; res,err:=db.Collection("polls").InsertOne(c,p); if err!=nil { c.JSON(500,gin.H{"error":"Could not create poll"}); return }; p.ID=res.InsertedID.(primitive.ObjectID); c.JSON(201,p) }
func myPolls(c *gin.Context){ uid,_:=primitive.ObjectIDFromHex(c.GetString("userId")); cur,err:=db.Collection("polls").Find(c,bson.M{"creatorId":uid},options.Find().SetSort(bson.D{{Key:"createdAt",Value:-1}})); if err!=nil { c.JSON(500,gin.H{"error":"Could not load polls"}); return }; var ps []Poll; if err=cur.All(c,&ps); err!=nil { c.JSON(500,gin.H{"error":"Could not load polls"}); return }; c.JSON(200,ps) }
func getPoll(c *gin.Context){ var p Poll; err:=db.Collection("polls").FindOne(c,bson.M{"shareCode":c.Param("shareCode")}).Decode(&p); if err!=nil { c.JSON(404,gin.H{"error":"Poll not found"}); return }; counts:=getCounts(c,p); c.JSON(200,gin.H{"poll":p,"counts":counts}) }
func vote(c *gin.Context){ var in struct{OptionIndex int `json:"optionIndex"`; VoterID string `json:"voterId"`}; if c.ShouldBindJSON(&in)!=nil || in.VoterID=="" { c.JSON(400,gin.H{"error":"Voter ID required"}); return }; var p Poll; if err:=db.Collection("polls").FindOne(c,bson.M{"shareCode":c.Param("shareCode")}).Decode(&p); err!=nil { c.JSON(404,gin.H{"error":"Poll not found"}); return }; if in.OptionIndex<0 || in.OptionIndex>=len(p.Options) { c.JSON(400,gin.H{"error":"Invalid option"}); return }; key:=fmt.Sprintf("poll:%s:counts",p.ID.Hex()); if _,err:=db.Collection("votes").InsertOne(c,Vote{PollID:p.ID,OptionIndex:in.OptionIndex,VoterID:in.VoterID,CreatedAt:time.Now()}); err!=nil { c.JSON(500,gin.H{"error":"Could not save vote"}); return }; rdb.HIncrBy(c,key,fmt.Sprint(in.OptionIndex),1); rdb.Publish(c,"poll:"+p.ShareCode,fmt.Sprint(in.OptionIndex)).Err(); c.JSON(200,gin.H{"message":"Vote recorded","counts":getCounts(c,p)}) }
func getCounts(ctx context.Context,p Poll) []int { key:="poll:"+p.ID.Hex()+":counts"; m,err:=rdb.HGetAll(ctx,key).Result(); counts:=make([]int,len(p.Options)); if err!=nil{return counts}; for k,v:=range m { var i,n int; fmt.Sscanf(k,"%d",&i); fmt.Sscanf(v,"%d",&n); if i>=0&&i<len(counts){counts[i]=n} }; return counts }
func events(c *gin.Context){ var p Poll; if err:=db.Collection("polls").FindOne(c,bson.M{"shareCode":c.Param("shareCode")}).Decode(&p); err!=nil { c.Status(404); return }; c.Header("Content-Type","text/event-stream"); c.Header("Cache-Control","no-cache"); c.Header("Connection","keep-alive"); c.Header("X-Accel-Buffering","no"); pub:=rdb.Subscribe(c,"poll:"+p.ShareCode); defer pub.Close(); ch:=pub.Channel(); c.Stream(func(w io.Writer) bool { select { case <-c.Request.Context().Done(): return false; case <-time.After(30*time.Second): fmt.Fprint(w,": keepalive\n\n"); return true; case <-ch: counts:=getCounts(c,p); data,_:=json.Marshal(counts); fmt.Fprintf(w,"data: %s\n\n",data); return true } }) }
func requireAuth() gin.HandlerFunc { return func(c *gin.Context){ h:=c.GetHeader("Authorization"); if !strings.HasPrefix(h,"Bearer "){c.AbortWithStatusJSON(401,gin.H{"error":"Unauthorized"});return}; tok,err:=jwt.ParseWithClaims(strings.TrimPrefix(h,"Bearer "),&Claims{},func(t *jwt.Token)(interface{},error){return jwtSecret,nil}); if err!=nil || !tok.Valid {c.AbortWithStatusJSON(401,gin.H{"error":"Invalid token"});return}; cl:=tok.Claims.(*Claims); c.Set("userId",cl.UserID); c.Next()} }
func makeToken(id primitive.ObjectID)(string,error){ return jwt.NewWithClaims(jwt.SigningMethodHS256,Claims{UserID:id.Hex(),RegisteredClaims:jwt.RegisteredClaims{ExpiresAt:jwt.NewNumericDate(time.Now().Add(24*time.Hour))}}).SignedString(jwtSecret) }
func validEmail(s string)bool{return strings.Contains(s,"@")&&strings.Contains(s,".")}
func getenv(k,d string)string{if v:=os.Getenv(k);v!=""{return v};return d}
 