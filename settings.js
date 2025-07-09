/*

Minimal kasih credits DitchieMods

*/


const fs = require('fs')

global.botname = "HadesCrashV1 gen2"
global.version = "1.0 gen2"
global.owner = "6285141324992"
global.numberbot = "6285141324992"
global.footer = "𝑫͢𝒊𝒕͠𝒄𝒉͜͡𝒊𝒆͎𝑴͢𝒐͡𝒅𝒔"
global.title = "© 𝑫͢𝒊𝒕͠𝒄𝒉͜͡𝒊𝒆͎𝑴͢𝒐͡𝒅𝒔"
global.website = "https://whatsapp.com/channel/0029Vay4hgh2Jl8J4yIOIA3i"
global.idch = "120363390274692764@newsletter"
global.chjid = "https://whatsapp.com/channel/0029Vay4hgh2Jl8J4yIOIA3i"
global.wm = "𝑫͢𝒊𝒕͠𝒄𝒉͜͡𝒊𝒆͎𝑴͢𝒐͡𝒅𝒔"
//===================================//
global.session = "session"

//=========== [ DLAY-PUSH ] ===========//
global.delaypushv1 = 7000 // 1000-1DETIK
global.delaypushv2 = 7000 // 1000-1DETIK

//=========== [ IMG-URL ] ===========//
global.thumb = "https://files.catbox.moe/k14raw.jpg"
global.image = {
Reply: "https://files.catbox.moe/k14raw.jpg"
}
//==================================//

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})
