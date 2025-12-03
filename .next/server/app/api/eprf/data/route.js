(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[155],{2067:t=>{"use strict";t.exports=require("node:async_hooks")},6195:t=>{"use strict";t.exports=require("node:buffer")},7612:(t,e,r)=>{"use strict";r.r(e),r.d(e,{ComponentMod:()=>I,default:()=>O});var a={};r.r(a),r.d(a,{GET:()=>u,POST:()=>o,runtime:()=>c});var i={};r.r(i),r.d(i,{originalPathname:()=>p,patchFetch:()=>A,requestAsyncStorage:()=>l,routeModule:()=>R,serverHooks:()=>N,staticGenerationAsyncStorage:()=>T});var s=r(8842),d=r(2561),n=r(4828),E=r(6631),_=r(1213);let c="edge";async function u(t){try{let{searchParams:e}=new URL(t.url),r=e.get("incidentId"),a=e.get("patientLetter"),i=e.get("section");if(!r||!a)return Response.json({success:!1,error:"Missing required parameters"},{status:400});if(i){let t=await (0,_.Y0)(r,a,i);return Response.json({success:!0,data:t})}{let t=await (0,_.wK)(r,a);return Response.json({success:!0,data:t})}}catch(t){return console.error("GET ePRF data error:",t),Response.json({success:!1,error:t.message},{status:500})}}async function o(t){try{let{incidentId:e,patientLetter:r,section:a,data:i}=await t.json();if(!e||!r||!a||void 0===i)return Response.json({success:!1,error:"Missing required fields"},{status:400});let s=await (0,_.wX)(e,r,a,i);return Response.json({success:!0,result:s})}catch(t){return console.error("POST ePRF data error:",t),Response.json({success:!1,error:t.message},{status:500})}}let R=new d.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/eprf/data/route",pathname:"/api/eprf/data",filename:"route",bundlePath:"app/api/eprf/data/route"},resolvedPagePath:"C:\\Users\\Toby\\Downloads\\node-v24.11.1-win-x64\\app123\\app\\api\\eprf\\data\\route.js",nextConfigOutput:"",userland:a}),{requestAsyncStorage:l,staticGenerationAsyncStorage:T,serverHooks:N}=R,p="/api/eprf/data/route";function A(){return(0,E.XH)({serverHooks:N,staticGenerationAsyncStorage:T})}let I=i,O=s.a.wrap(R)},1213:(t,e,r)=>{"use strict";r.d(e,{$h:()=>E,AW:()=>I,F3:()=>c,Fs:()=>A,HX:()=>_,J3:()=>n,PR:()=>N,Qr:()=>S,Y0:()=>o,cO:()=>T,ie:()=>d,kX:()=>l,mG:()=>O,qx:()=>p,wK:()=>R,wX:()=>u,xN:()=>s});var a=r(1989);function i(){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");return(0,a.qn)(process.env.DATABASE_URL)}async function s(){let t=i();return await t`
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
  `,await t`CREATE INDEX IF NOT EXISTS idx_eprf_records_author ON eprf_records(author_discord_id)`,await t`CREATE INDEX IF NOT EXISTS idx_eprf_records_status ON eprf_records(status)`,await t`CREATE INDEX IF NOT EXISTS idx_eprf_data_incident ON eprf_data(incident_id, patient_letter)`,{success:!0}}async function d(t,e,r,a,s){let d=i();return(await d`
    INSERT INTO eprf_records (incident_id, patient_letter, author_discord_id, author_callsign, fleet_id)
    VALUES (${t}, ${e}, ${r}, ${a}, ${s})
    ON CONFLICT (incident_id, patient_letter) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function n(t,e){let r=i();return(await r`
    SELECT * FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `)[0]||null}async function E(t,e){let r=i();return(await r`
    UPDATE eprf_records 
    SET status = 'complete', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}async function _(t,e){let r=i();return await r`
    DELETE FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,(await r`
    DELETE FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
    AND status = 'incomplete'
    RETURNING *
  `)[0]||null}async function c(t,e,r,a){let s=i();return(await s`
    UPDATE eprf_records 
    SET author_discord_id = ${r}, 
        author_callsign = ${a},
        updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}async function u(t,e,r,a){let s=i();return(await s`
    INSERT INTO eprf_data (incident_id, patient_letter, section, data)
    VALUES (${t}, ${e}, ${r}, ${JSON.stringify(a)})
    ON CONFLICT (incident_id, patient_letter, section) 
    DO UPDATE SET data = ${JSON.stringify(a)}, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function o(t,e,r){let a=i(),s=await a`
    SELECT data FROM eprf_data 
    WHERE incident_id = ${t} 
    AND patient_letter = ${e} 
    AND section = ${r}
  `;return s[0]?.data||null}async function R(t,e){let r=i(),a=await r`
    SELECT section, data FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,s={};for(let t of a)s[t.section]=t.data;return s}async function l(t,e,r,a){let s=i();return(await s`
    INSERT INTO users (discord_id, discord_username, callsign, vehicle, last_login)
    VALUES (${t}, ${e}, ${r}, ${a}, CURRENT_TIMESTAMP)
    ON CONFLICT (discord_id) 
    DO UPDATE SET 
      discord_username = ${e},
      callsign = ${r},
      vehicle = ${a},
      last_login = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function T(){let t=i();return await t`
    SELECT * FROM users 
    WHERE last_login > NOW() - INTERVAL '24 hours'
    ORDER BY last_login DESC
  `}async function N(t){let e=i();return(await e`
    SELECT * FROM users WHERE discord_id = ${t}
  `)[0]||null}async function p(t,e,r,a,s){let d=i();return r&&"all"!==r?e?await d`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND status = ${r}
        AND (incident_id ILIKE ${"%"+e+"%"} OR patient_letter ILIKE ${"%"+e+"%"})
        ORDER BY created_at DESC
      `:await d`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND status = ${r}
        ORDER BY created_at DESC
      `:e?await d`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND (incident_id ILIKE ${"%"+e+"%"} OR patient_letter ILIKE ${"%"+e+"%"})
        ORDER BY created_at DESC
      `:await d`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        ORDER BY created_at DESC
      `}async function A(t,e,r){let a=i();return r&&e&&"all"!==e?t?await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        AND r.status = ${e}
        AND (r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"})
        ORDER BY r.created_at DESC
      `:await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        AND r.status = ${e}
        ORDER BY r.created_at DESC
      `:r?t?await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        AND (r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"})
        ORDER BY r.created_at DESC
      `:await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${r}
        ORDER BY r.created_at DESC
      `:e&&"all"!==e?t?await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${e}
        AND (r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"})
        ORDER BY r.created_at DESC
      `:await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${e}
        ORDER BY r.created_at DESC
      `:t?await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.incident_id ILIKE ${"%"+t+"%"} OR r.patient_letter ILIKE ${"%"+t+"%"} OR r.author_callsign ILIKE ${"%"+t+"%"}
        ORDER BY r.created_at DESC
      `:await a`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        ORDER BY r.created_at DESC
      `}async function I(){let t=i();return await t`
    SELECT * FROM users 
    ORDER BY last_login DESC
  `}async function O(t,e){let r=i();return await r`
    DELETE FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,(await r`
    DELETE FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]||null}async function S(t,e,r){let a=i();return(await a`
    UPDATE eprf_records 
    SET 
      status = COALESCE(${r.status}, status),
      author_discord_id = COALESCE(${r.author_discord_id}, author_discord_id),
      author_callsign = COALESCE(${r.author_callsign}, author_callsign),
      updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}}},t=>{var e=e=>t(t.s=e);t.O(0,[378,112],()=>e(7612));var r=t.O();(_ENTRIES="undefined"==typeof _ENTRIES?{}:_ENTRIES)["middleware_app/api/eprf/data/route"]=r}]);
//# sourceMappingURL=route.js.map