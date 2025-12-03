(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[243],{2067:t=>{"use strict";t.exports=require("node:async_hooks")},6195:t=>{"use strict";t.exports=require("node:buffer")},3995:(t,e,r)=>{"use strict";r.r(e),r.d(e,{ComponentMod:()=>S,default:()=>L});var a={};r.r(a),r.d(a,{DELETE:()=>l,GET:()=>_,PUT:()=>R,runtime:()=>o});var s={};r.r(s),r.d(s,{originalPathname:()=>I,patchFetch:()=>O,requestAsyncStorage:()=>N,routeModule:()=>T,serverHooks:()=>p,staticGenerationAsyncStorage:()=>A});var i=r(8842),n=r(2561),d=r(4828),E=r(6631),c=r(1213);let o="edge";function u(t){return"695765253612953651"===t}async function _(t){try{let{searchParams:e}=new URL(t.url),r=e.get("discordId"),a=e.get("query"),s=e.get("status"),i=e.get("authorId"),n=e.get("type");if(!u(r))return Response.json({success:!1,error:"Unauthorized"},{status:403});if("users"===n){let t=await (0,c.AW)();return Response.json({success:!0,users:t})}let d=await (0,c.Fs)(a||void 0,s||void 0,i||void 0);return Response.json({success:!0,records:d})}catch(t){return console.error("Admin GET error:",t),Response.json({success:!1,error:t.message},{status:500})}}async function R(t){try{let e;let r=await t.json(),{discordId:a,incidentId:s,patientLetter:i,action:n,newAuthorDiscordId:d,newAuthorCallsign:E,status:o}=r;if(!u(a))return Response.json({success:!1,error:"Unauthorized"},{status:403});if(!s||!i)return Response.json({success:!1,error:"Missing incidentId or patientLetter"},{status:400});return e="transfer"===n?await (0,c.F3)(s,i,d,E):"updateStatus"===n?await (0,c.Qr)(s,i,{status:o}):await (0,c.Qr)(s,i,r.updates||{}),Response.json({success:!0,record:e})}catch(t){return console.error("Admin PUT error:",t),Response.json({success:!1,error:t.message},{status:500})}}async function l(t){try{let{discordId:e,incidentId:r,patientLetter:a}=await t.json();if(!u(e))return Response.json({success:!1,error:"Unauthorized"},{status:403});if(!r||!a)return Response.json({success:!1,error:"Missing incidentId or patientLetter"},{status:400});let s=await (0,c.mG)(r,a);return Response.json({success:!0,deleted:s})}catch(t){return console.error("Admin DELETE error:",t),Response.json({success:!1,error:t.message},{status:500})}}let T=new n.AppRouteRouteModule({definition:{kind:d.x.APP_ROUTE,page:"/api/admin/records/route",pathname:"/api/admin/records",filename:"route",bundlePath:"app/api/admin/records/route"},resolvedPagePath:"C:\\Users\\Toby\\Downloads\\node-v24.11.1-win-x64\\app123\\app\\api\\admin\\records\\route.js",nextConfigOutput:"",userland:a}),{requestAsyncStorage:N,staticGenerationAsyncStorage:A,serverHooks:p}=T,I="/api/admin/records/route";function O(){return(0,E.XH)({serverHooks:p,staticGenerationAsyncStorage:A})}let S=s,L=i.a.wrap(T)},1213:(t,e,r)=>{"use strict";r.d(e,{$h:()=>E,AW:()=>I,F3:()=>o,Fs:()=>p,HX:()=>c,J3:()=>d,PR:()=>N,Qr:()=>S,Y0:()=>_,cO:()=>T,ie:()=>n,kX:()=>l,mG:()=>O,qx:()=>A,wK:()=>R,wX:()=>u,xN:()=>i});var a=r(1989);function s(){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");return(0,a.qn)(process.env.DATABASE_URL)}async function i(){let t=s();return await t`
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
  `,await t`CREATE INDEX IF NOT EXISTS idx_eprf_records_author ON eprf_records(author_discord_id)`,await t`CREATE INDEX IF NOT EXISTS idx_eprf_records_status ON eprf_records(status)`,await t`CREATE INDEX IF NOT EXISTS idx_eprf_data_incident ON eprf_data(incident_id, patient_letter)`,{success:!0}}async function n(t,e,r,a,i){let n=s();return(await n`
    INSERT INTO eprf_records (incident_id, patient_letter, author_discord_id, author_callsign, fleet_id)
    VALUES (${t}, ${e}, ${r}, ${a}, ${i})
    ON CONFLICT (incident_id, patient_letter) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function d(t,e){let r=s();return(await r`
    SELECT * FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `)[0]||null}async function E(t,e){let r=s();return(await r`
    UPDATE eprf_records 
    SET status = 'complete', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}async function c(t,e){let r=s();return await r`
    DELETE FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,(await r`
    DELETE FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
    AND status = 'incomplete'
    RETURNING *
  `)[0]||null}async function o(t,e,r,a){let i=s();return(await i`
    UPDATE eprf_records 
    SET author_discord_id = ${r}, 
        author_callsign = ${a},
        updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}async function u(t,e,r,a){let i=s();return(await i`
    INSERT INTO eprf_data (incident_id, patient_letter, section, data)
    VALUES (${t}, ${e}, ${r}, ${JSON.stringify(a)})
    ON CONFLICT (incident_id, patient_letter, section) 
    DO UPDATE SET data = ${JSON.stringify(a)}, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function _(t,e,r){let a=s(),i=await a`
    SELECT data FROM eprf_data 
    WHERE incident_id = ${t} 
    AND patient_letter = ${e} 
    AND section = ${r}
  `;return i[0]?.data||null}async function R(t,e){let r=s(),a=await r`
    SELECT section, data FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,i={};for(let t of a)i[t.section]=t.data;return i}async function l(t,e,r,a){let i=s();return(await i`
    INSERT INTO users (discord_id, discord_username, callsign, vehicle, last_login)
    VALUES (${t}, ${e}, ${r}, ${a}, CURRENT_TIMESTAMP)
    ON CONFLICT (discord_id) 
    DO UPDATE SET 
      discord_username = ${e},
      callsign = ${r},
      vehicle = ${a},
      last_login = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function T(){let t=s();return await t`
    SELECT * FROM users 
    WHERE last_login > NOW() - INTERVAL '24 hours'
    ORDER BY last_login DESC
  `}async function N(t){let e=s();return(await e`
    SELECT * FROM users WHERE discord_id = ${t}
  `)[0]||null}async function A(t,e,r,a,i){let n=s();return r&&"all"!==r?e?await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND status = ${r}
        AND (incident_id ILIKE ${"%"+e+"%"} OR patient_letter ILIKE ${"%"+e+"%"})
        ORDER BY created_at DESC
      `:await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND status = ${r}
        ORDER BY created_at DESC
      `:e?await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        AND (incident_id ILIKE ${"%"+e+"%"} OR patient_letter ILIKE ${"%"+e+"%"})
        ORDER BY created_at DESC
      `:await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${t}
        ORDER BY created_at DESC
      `}async function p(t,e,r){let a=s();return r&&e&&"all"!==e?t?await a`
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
      `}async function I(){let t=s();return await t`
    SELECT * FROM users 
    ORDER BY last_login DESC
  `}async function O(t,e){let r=s();return await r`
    DELETE FROM eprf_data 
    WHERE incident_id = ${t} AND patient_letter = ${e}
  `,(await r`
    DELETE FROM eprf_records 
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]||null}async function S(t,e,r){let a=s();return(await a`
    UPDATE eprf_records 
    SET 
      status = COALESCE(${r.status}, status),
      author_discord_id = COALESCE(${r.author_discord_id}, author_discord_id),
      author_callsign = COALESCE(${r.author_callsign}, author_callsign),
      updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${t} AND patient_letter = ${e}
    RETURNING *
  `)[0]}}},t=>{var e=e=>t(t.s=e);t.O(0,[378,112],()=>e(3995));var r=t.O();(_ENTRIES="undefined"==typeof _ENTRIES?{}:_ENTRIES)["middleware_app/api/admin/records/route"]=r}]);
//# sourceMappingURL=route.js.map