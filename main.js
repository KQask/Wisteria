const Auth = require("./tasks/Tasks");
const fs = require("fs")
const  { Worker } = require('worker_threads');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main () {

    let username = "";
    let password = "";
    let CRNs = [];


    if (!fs.existsSync('./data.json')) {

        const Registration_Info = {
            CRNs: ['00000', '00000'],
            Username: "",
            Password: "",
        }


        fs.writeFileSync('data.json', JSON.stringify(Registration_Info), (err) => {  
            if (err) throw err;
            console.log("Created data.json, please fill in the information and rerun the application.")
            process.exit();
        });
        if(!fs.existsSync('./data.json')) {
            fs.writeFile('./data.json');
        }
    
    }


    fs.readFile('data.json', 'utf8', async (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }
    
        try {
            const Registration_Info = JSON.parse(data);

            username = Registration_Info.Username;
            password = Registration_Info.Password;
            CRNs = Registration_Info.CRNs;
            let attempt = 0;
            
            const worker = new Worker('./tasks/workers.js');
            worker.postMessage({ action: 'start', Choice: "Register", Term_Season:"Fall", Term_Year: "2024", username, password, CRNs });
            while(true) {
                await sleep(1000);
                console.log("new message from main thread! Attempt: ", attempt++);
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    });
    
}

main();