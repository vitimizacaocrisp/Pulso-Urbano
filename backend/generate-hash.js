const bcrypt = require('bcryptjs');
const password = 's{74L93*';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);

console.log('Sua senha é:', password);
console.log('Seu novo hash é (copie esta linha):');
console.log(hash);