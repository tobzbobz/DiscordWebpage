(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[369],{2067:t=>{"use strict";t.exports=require("node:async_hooks")},6195:t=>{"use strict";t.exports=require("node:buffer")},6614:(t,e,r)=>{"use strict";r.r(e),r.d(e,{ComponentMod:()=>I,default:()=>O});var i={};r.r(i),r.d(i,{GET:()=>u,runtime:()=>c});var a={};r.r(a),r.d(a,{originalPathname:()=>N,patchFetch:()=>A,requestAsyncStorage:()=>R,routeModule:()=>o,serverHooks:()=>T,staticGenerationAsyncStorage:()=>l});var d=r(8842),s=r(2561),n=r(4828),E=r(6631),_=r(1213);let c="edge";async function u(t){try{return await (0,_.xN)(),Response.json({success:!0,message:"Database initialized successfully"})}catch(t){return console.error("Database initialization error:",t),Response.json({success:!1,error:t.message},{status:500})}}let o=new s.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/db/init/route",pathname:"/api/db/init",filename:"route",bundlePath:"app/api/db/init/route"},resolvedPagePath:"C:\\Users\\Toby\\Downloads\\node-v24.11.1-win-x64\\app123\\app\\api\\db\\init\\route.js",nextConfigOutput:"",userland:i}),{requestAsyncStorage:R,staticGenerationAsyncStorage:l,serverHooks:T}=o,N="/api/db/init/route";function A(){return(0,E.XH)({serverHooks:T,staticGenerationAsyncStorage:l})}let I=a,O=d.a.wrap(o)},1213:(t,e,r)=>{"use strict";r.d(e,{$h:()=>E,AW:()=>O,F3:()=>c,Fs:()=>I,HX:()=>_,J3:()=>n,PR:()=>N,Qr:()=>S,Y0:()=>o,cO:()=>T,ie:()=>s,kX:()=>l,mG:()=>p,qx:()=>A,wK:()=>R,wX:()=>u,xN:()=>d});var i=r(1989);function a(){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");return(0,i.qn)(process.env.DATABASE_URL)}async function d(){let t=a();return await t`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      discord_id VARCHAR(255) UNIQUE NOT NULL,
      discord_username VARCHAR(255),
      callsign VARCHAR(100),
      vehicle VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,await t`
    CREATE TABLE IF NOT EXISTS eprf_records (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      status VARCHAR(20) DEFAULT 'incomplete',
      author_discord_id VARCHAR(255) NOT NULL,
      author_callsign VARCHAR(100),
      fleet_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMP,
      UNIQUE(incident_id, patient_letter)
    )
  `,await t`
    CREATE TABLE IF NOT EXISTS eprf_data (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      section VARCHAR(50) NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, patient_letter, section)
    )
  `,await t`CREATE INDEX IF NOT EXISTS idx_eprf_records_author ON eprf_records(author_discord_id)`,await t`CREATE INDEX IF NOT EXISTS idx_eprf_records_status ON eprf_records(status)`,await t`CREATE INDEX IF NOT EXISTS idx_eprf_data_incident ON eprf_data(incident_id, patient_letter)`,{success:!0}}async function s(t,e,r,i,d){let s=a();return(await s`
    INSERT INTO eprf_records (incident_id, patient_letter, author_discord_id, author_callsign, fleet_id)
    VALUES (${t}, ${e}, ${r}, ${i}, ${d})
    ON CONFLICT (incident_id, patient_letter) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function n(t,e){let r=a();return(await r`
    SELECT * FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `)[0]||null}async function E(t,e){let r=a();return(await r`
    UPDATE eprf_records 
    SET status = 'complete', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}async function _(t,e){let r=a();return await r`
    DELETE FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,(await r`
    DELETE FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
    AND status = 'incomplete'
    RETURNING *
  `)[0]||null}async function c(t,e,r,i){let d=a();return(await d`
    UPDATE eprf_records 
    SET author_discord_id = ${r}, 
        author_callsign = ${i},
        updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}async function u(t,e,r,i){let d=a();return(await d`
    INSERT INTO eprf_data (incident_id, patient_letter, section, data)
    VALUES (${t}, ${e}, ${r}, ${JSON.stringify(i)})
    ON CONFLICT (incident_id, patient_letter, section) 
    DO UPDATE SET data = ${JSON.stringify(i)}, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function o(t,e,r){let i=a(),d=await i`
    SELECT data FROM eprf_data 
    WHERE incident_id = ${t} 
    AND patient_letter = ${e} 
    AND section = ${r}
  `;return d[0]?.data||null}async function R(t,e){let r=a(),i=await r`
    SELECT section, data FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,d={};for(let t of i)d[t.section]=t.data;return d}async function l(t,e,r,i){let d=a();return(await d`
    INSERT INTO users (discord_id, discord_username, callsign, vehicle, last_login)
    VALUES (${t}, ${e}, ${r}, ${i}, CURRENT_TIMESTAMP)
    ON CONFLICT (discord_id) 
    DO UPDATE SET 
      discord_username = ${e},
      callsign = ${r},
      vehicle = ${i},
      last_login = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function T(){let t=a();return await t`
    SELECT * FROM users 
    WHERE last_login > NOW() - INTERVAL '24 hours'
    ORDER BY last_login DESC
  `}async function N(t){let e=a();return(await e`
    SELECT * FROM users WHERE discord_id = ${t}
  `)[0]||null}async function A(t,e,r,i,d){let s=a();return r&&"all"!==r?e?await s`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND status = ${r}
        AND (incident_id ILIKE ${"%"+e+"%"} OR patient_letter ILIKE ${"%"+e+"%"})
        ORDER BY created_at DESC
      `:await s`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND status = ${r}
        ORDER BY created_at DESC
      `:e?await s`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND (incident_id ILIKE ${"%"+e+"%"} OR patient_letter ILIKE ${"%"+e+"%"})
        ORDER BY created_at DESC
      `:await s`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        ORDER BY created_at DESC
      `}async function I(t,e,r){let i=a();return r&&e&&"all"!==e?t?await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        AND r.status = ${e}
        AND (r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"})
        ORDER BY r.created_at DESC
      `:await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        AND r.status = ${e}
        ORDER BY r.created_at DESC
      `:r?t?await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        AND (r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"})
        ORDER BY r.created_at DESC
      `:await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        ORDER BY r.created_at DESC
      `:e&&"all"!==e?t?await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${e}
        AND (r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"})
        ORDER BY r.created_at DESC
      `:await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${e}
        ORDER BY r.created_at DESC
      `:t?await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"}
        ORDER BY r.created_at DESC
      `:await i`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        ORDER BY r.created_at DESC
      `}async function O(){let t=a();return await t`
    SELECT * FROM users 
    ORDER BY last_login DESC
  `}async function p(t,e){let r=a();return await r`
    DELETE FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,(await r`
    DELETE FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]||null}async function S(t,e,r){let i=a();return(await i`
    UPDATE eprf_records 
    SET 
      status = COALESCE(${r.status}, status),
      author_discord_id = COALESCE(${r.author_discord_id}, author_discord_id),
      author_callsign = COALESCE(${r.author_callsign}, author_callsign),
      updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}}},t=>{var e=e=>t(t.s=e);t.O(0,[378,112],()=>e(6614));var r=t.O();(_ENTRIES="undefined"==typeof _ENTRIES?{}:_ENTRIES)["middleware_app/api/db/init/route"]=r}]);
//# sourceMappingURL=route.js.map