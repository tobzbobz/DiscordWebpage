(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[273],{2067:e=>{"use strict";e.exports=require("node:async_hooks")},6195:e=>{"use strict";e.exports=require("node:buffer")},7273:(e,r,t)=>{"use strict";t.r(r),t.d(r,{ComponentMod:()=>S,default:()=>L});var s={};t.r(s),t.d(s,{DELETE:()=>l,GET:()=>u,POST:()=>_,PUT:()=>R,runtime:()=>o});var a={};t.r(a),t.d(a,{originalPathname:()=>I,patchFetch:()=>O,requestAsyncStorage:()=>p,routeModule:()=>T,serverHooks:()=>A,staticGenerationAsyncStorage:()=>N});var i=t(8842),n=t(2561),d=t(4828),c=t(6631),E=t(1213);let o="edge";async function u(e){try{let{searchParams:r}=new URL(e.url),t=r.get("discordId"),s=r.get("incidentId"),a=r.get("patientLetter"),i=r.get("query"),n=r.get("status");if(s&&a){let e=await (0,E.J3)(s,a);return Response.json({success:!0,record:e})}if(!t)return Response.json({success:!1,error:"Missing required parameters"},{status:400});{let e=await (0,E.qx)(t,i,n);return Response.json({success:!0,records:e})}}catch(e){return console.error("GET ePRF error:",e),Response.json({success:!1,error:e.message},{status:500})}}async function _(e){try{let{incidentId:r,patientLetter:t,authorDiscordId:s,authorCallsign:a,fleetId:i}=await e.json();if(!r||!t||!s)return Response.json({success:!1,error:"Missing required fields"},{status:400});let n=await (0,E.ie)(r,t,s,a||"Unknown",i||"");return Response.json({success:!0,record:n})}catch(e){return console.error("POST ePRF error:",e),Response.json({success:!1,error:e.message},{status:500})}}async function R(e){try{let r;let{action:t,incidentId:s,patientLetter:a,newAuthorDiscordId:i,newAuthorCallsign:n}=await e.json();if(!s||!a||!t)return Response.json({success:!1,error:"Missing required fields"},{status:400});if("complete"===t)r=await (0,E.$h)(s,a);else{if("transfer"!==t)return Response.json({success:!1,error:"Invalid action"},{status:400});if(!i||!n)return Response.json({success:!1,error:"Missing transfer target"},{status:400});r=await (0,E.F3)(s,a,i,n)}return Response.json({success:!0,record:r})}catch(e){return console.error("PUT ePRF error:",e),Response.json({success:!1,error:e.message},{status:500})}}async function l(e){try{let{searchParams:r}=new URL(e.url),t=r.get("incidentId"),s=r.get("patientLetter");if(!t||!s)return Response.json({success:!1,error:"Missing required parameters"},{status:400});if(await (0,E.HX)(t,s))return Response.json({success:!0,message:"Record deleted"});return Response.json({success:!1,error:"Record not found or already completed"},{status:404})}catch(e){return console.error("DELETE ePRF error:",e),Response.json({success:!1,error:e.message},{status:500})}}let T=new n.AppRouteRouteModule({definition:{kind:d.x.APP_ROUTE,page:"/api/eprf/records/route",pathname:"/api/eprf/records",filename:"route",bundlePath:"app/api/eprf/records/route"},resolvedPagePath:"C:\\Users\\Toby\\Downloads\\node-v24.11.1-win-x64\\app123\\app\\api\\eprf\\records\\route.js",nextConfigOutput:"",userland:s}),{requestAsyncStorage:p,staticGenerationAsyncStorage:N,serverHooks:A}=T,I="/api/eprf/records/route";function O(){return(0,c.XH)({serverHooks:A,staticGenerationAsyncStorage:N})}let S=a,L=i.a.wrap(T)},1213:(e,r,t)=>{"use strict";t.d(r,{$h:()=>c,AW:()=>I,F3:()=>o,Fs:()=>A,HX:()=>E,J3:()=>d,PR:()=>p,Qr:()=>S,Y0:()=>_,cO:()=>T,ie:()=>n,kX:()=>l,mG:()=>O,qx:()=>N,wK:()=>R,wX:()=>u,xN:()=>i});var s=t(1989);function a(){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL environment variable is not set");return(0,s.qn)(process.env.DATABASE_URL)}async function i(){let e=a();return await e`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      discord_id VARCHAR(255) UNIQUE NOT NULL,
      discord_username VARCHAR(255),
      callsign VARCHAR(100),
      vehicle VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,await e`
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
  `,await e`
    CREATE TABLE IF NOT EXISTS eprf_data (
      id SERIAL PRIMARY KEY,
      incident_id VARCHAR(255) NOT NULL,
      patient_letter CHAR(1) NOT NULL,
      section VARCHAR(50) NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, patient_letter, section)
    )
  `,await e`CREATE INDEX IF NOT EXISTS idx_eprf_records_author ON eprf_records(author_discord_id)`,await e`CREATE INDEX IF NOT EXISTS idx_eprf_records_status ON eprf_records(status)`,await e`CREATE INDEX IF NOT EXISTS idx_eprf_data_incident ON eprf_data(incident_id, patient_letter)`,{success:!0}}async function n(e,r,t,s,i){let n=a();return(await n`
    INSERT INTO eprf_records (incident_id, patient_letter, author_discord_id, author_callsign, fleet_id)
    VALUES (${e}, ${r}, ${t}, ${s}, ${i})
    ON CONFLICT (incident_id, patient_letter) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function d(e,r){let t=a();return(await t`
    SELECT * FROM eprf_records 
    WHERE incident_id = ${e} AND patient_letter = ${r}
  `)[0]||null}async function c(e,r){let t=a();return(await t`
    UPDATE eprf_records 
    SET status = 'complete', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${e} AND patient_letter = ${r}
    RETURNING *
  `)[0]}async function E(e,r){let t=a();return await t`
    DELETE FROM eprf_data 
    WHERE incident_id = ${e} AND patient_letter = ${r}
  `,(await t`
    DELETE FROM eprf_records 
    WHERE incident_id = ${e} AND patient_letter = ${r}
    AND status = 'incomplete'
    RETURNING *
  `)[0]||null}async function o(e,r,t,s){let i=a();return(await i`
    UPDATE eprf_records 
    SET author_discord_id = ${t}, 
        author_callsign = ${s},
        updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${e} AND patient_letter = ${r}
    RETURNING *
  `)[0]}async function u(e,r,t,s){let i=a();return(await i`
    INSERT INTO eprf_data (incident_id, patient_letter, section, data)
    VALUES (${e}, ${r}, ${t}, ${JSON.stringify(s)})
    ON CONFLICT (incident_id, patient_letter, section) 
    DO UPDATE SET data = ${JSON.stringify(s)}, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function _(e,r,t){let s=a(),i=await s`
    SELECT data FROM eprf_data 
    WHERE incident_id = ${e} 
    AND patient_letter = ${r} 
    AND section = ${t}
  `;return i[0]?.data||null}async function R(e,r){let t=a(),s=await t`
    SELECT section, data FROM eprf_data 
    WHERE incident_id = ${e} AND patient_letter = ${r}
  `,i={};for(let e of s)i[e.section]=e.data;return i}async function l(e,r,t,s){let i=a();return(await i`
    INSERT INTO users (discord_id, discord_username, callsign, vehicle, last_login)
    VALUES (${e}, ${r}, ${t}, ${s}, CURRENT_TIMESTAMP)
    ON CONFLICT (discord_id) 
    DO UPDATE SET 
      discord_username = ${r},
      callsign = ${t},
      vehicle = ${s},
      last_login = CURRENT_TIMESTAMP
    RETURNING *
  `)[0]}async function T(){let e=a();return await e`
    SELECT * FROM users 
    WHERE last_login > NOW() - INTERVAL '24 hours'
    ORDER BY last_login DESC
  `}async function p(e){let r=a();return(await r`
    SELECT * FROM users WHERE discord_id = ${e}
  `)[0]||null}async function N(e,r,t,s,i){let n=a();return t&&"all"!==t?r?await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${e}
        AND status = ${t}
        AND (incident_id ILIKE ${"%"+r+"%"} OR patient_letter ILIKE ${"%"+r+"%"})
        ORDER BY created_at DESC
      `:await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${e}
        AND status = ${t}
        ORDER BY created_at DESC
      `:r?await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${e}
        AND (incident_id ILIKE ${"%"+r+"%"} OR patient_letter ILIKE ${"%"+r+"%"})
        ORDER BY created_at DESC
      `:await n`
        SELECT * FROM eprf_records 
        WHERE author_discord_id = ${e}
        ORDER BY created_at DESC
      `}async function A(e,r,t){let s=a();return t&&r&&"all"!==r?e?await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${t}
        AND r.status = ${r}
        AND (r.incident_id ILIKE ${"%"+e+"%"} OR r.patient_letter ILIKE ${"%"+e+"%"} OR r.author_callsign ILIKE ${"%"+e+"%"})
        ORDER BY r.created_at DESC
      `:await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${t}
        AND r.status = ${r}
        ORDER BY r.created_at DESC
      `:t?e?await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${t}
        AND (r.incident_id ILIKE ${"%"+e+"%"} OR r.patient_letter ILIKE ${"%"+e+"%"} OR r.author_callsign ILIKE ${"%"+e+"%"})
        ORDER BY r.created_at DESC
      `:await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.author_discord_id = ${t}
        ORDER BY r.created_at DESC
      `:r&&"all"!==r?e?await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${r}
        AND (r.incident_id ILIKE ${"%"+e+"%"} OR r.patient_letter ILIKE ${"%"+e+"%"} OR r.author_callsign ILIKE ${"%"+e+"%"})
        ORDER BY r.created_at DESC
      `:await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.status = ${r}
        ORDER BY r.created_at DESC
      `:e?await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        WHERE r.incident_id ILIKE ${"%"+e+"%"} OR r.patient_letter ILIKE ${"%"+e+"%"} OR r.author_callsign ILIKE ${"%"+e+"%"}
        ORDER BY r.created_at DESC
      `:await s`
        SELECT r.*, u.callsign as user_callsign, u.discord_username 
        FROM eprf_records r
        LEFT JOIN users u ON r.author_discord_id = u.discord_id
        ORDER BY r.created_at DESC
      `}async function I(){let e=a();return await e`
    SELECT * FROM users 
    ORDER BY last_login DESC
  `}async function O(e,r){let t=a();return await t`
    DELETE FROM eprf_data 
    WHERE incident_id = ${e} AND patient_letter = ${r}
  `,(await t`
    DELETE FROM eprf_records 
    WHERE incident_id = ${e} AND patient_letter = ${r}
    RETURNING *
  `)[0]||null}async function S(e,r,t){let s=a();return(await s`
    UPDATE eprf_records 
    SET 
      status = COALESCE(${t.status}, status),
      author_discord_id = COALESCE(${t.author_discord_id}, author_discord_id),
      author_callsign = COALESCE(${t.author_callsign}, author_callsign),
      updated_at = CURRENT_TIMESTAMP
    WHERE incident_id = ${e} AND patient_letter = ${r}
    RETURNING *
  `)[0]}}},e=>{var r=r=>e(e.s=r);e.O(0,[378,112],()=>r(7273));var t=e.O();(_ENTRIES="undefined"==typeof _ENTRIES?{}:_ENTRIES)["middleware_app/api/eprf/records/route"]=t}]);
//# sourceMappingURL=route.js.map