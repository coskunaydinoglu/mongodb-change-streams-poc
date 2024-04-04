# mongodb-change-streams-poc
Mongodb Change streams PoC

This PoC demonstrate mongodb change streams. Demo listens changes on mondgodb database on collection product and writes to change to postgres.

Postgreql and mongodb runs as docker container. To run them

docker-compose up --build -d

I couldn't make nodejs app where the change stream logic exists connect the postgres database. As a result we run it manually.

# Instructions

1. Run the mongodb and postgress container `docker-compose up --build -d`
2. Initiate the replica set. 
Connect to mongodb container and run

mongosh -u root -p root -authenticationDatabase admin

In mongo shell run

rs.initiate()
cfg = rs.conf();
cfg.members[0].host = "localhost:27017"; 
rs.reconfig(cfg);


3. run the nodejs app

cd nodejs-app
cp .env.sample .env
node src/index.js

Node app will connect to mongodb and postgres. After connecting the mongodb it will start to listen the changes on docuument.

4. Create some documents in product collection. You will see that a record is created in product table in posgres database




cfg.members[0].host = localhost:27017"; 