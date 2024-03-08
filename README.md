# mongodb-change-streams-poc
Mongodb Change streams PoC

replica set init
rs.initiate()
cfg = rs.conf();
cfg.members[0].host = "resolvable-hostname:27017"; // Update with your resolvable hostname or IP
rs.reconfig(cfg);