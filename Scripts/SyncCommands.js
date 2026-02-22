const { updateCommands } = require('../Common/Discord/UpdateCommands');

const oryonServerOnly = !(process.argv[2] === 'false');
console.log(`Updating commands. Oryon server only is set to: ${oryonServerOnly}`);
updateCommands(oryonServerOnly);