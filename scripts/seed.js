require('dotenv').config(); const bcrypt=require('bcryptjs'); const {Pool}=require('pg');
(async()=>{const local=/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL||'');const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:local?false:{rejectUnauthorized:false}});try{const users=[
['USR-RETAILER-001','Demo Retailer','retailer@reflex.test','0700000001','Retailer123!','RETAILER','OFFLINE'],
['USR-DISPATCH-001','Demo Dispatcher','dispatcher@reflex.test','0700000002','Dispatcher123!','DISPATCHER','OFFLINE'],
['USR-RIDER-001','Brian Rider','rider1@reflex.test','0712000001','Rider123!','RIDER','AVAILABLE'],
['USR-RIDER-002','Amina Rider','rider2@reflex.test','0712000002','Rider123!','RIDER','AVAILABLE']];
for(const u of users){await pool.query(`INSERT INTO users(id,name,email,phone,password_hash,role,availability) VALUES($1,$2,$3,$4,$5,$6,$7)
ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,availability=EXCLUDED.availability`,[u[0],u[1],u[2],u[3],await bcrypt.hash(u[4],10),u[5],u[6]]);} console.log('Seed ready. Retailer: retailer@reflex.test / Retailer123! | Dispatcher: dispatcher@reflex.test / Dispatcher123! | Riders: rider1@reflex.test or rider2@reflex.test / Rider123!');}finally{await pool.end();}})().catch(e=>{console.error('Seed failed:',e.message);process.exit(1);});