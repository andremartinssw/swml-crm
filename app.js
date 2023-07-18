require('dotenv').config();
const ngrok = require('ngrok');
const express = require('express');
const bodyParser = require('body-parser');
const { RestClient } = require('@signalwire/compatibility-api');
const axios = require('axios');

let ngrok_url;

(async function () {
    ngrok_url = await ngrok.connect({
        authtoken: process.env.NGROK_TOKEN,
        addr: process.env.PORT
    });
    console.log("Change a Phone Number's settings to handle calls using 'a SWML Script', use an external URL, and change the text field to:", ngrok_url + '/agent');
})();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new RestClient(
    process.env.SIGNALWIRE_PROJECT_ID,
    process.env.SIGNALWIRE_API_TOKEN,
    {
        signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE
    }
);

// TODO: Add/update the users so one of them has the phone number you'll be calling from
let users = [
    {
        username: "admin",
        name: "Patrick Stewart",
        phoneNumber: "+1234567890"
    },
    {
        username: "meryl",
        name: "Meryl Streep",
        phoneNumber: "+1987654321"
    },
    {
        username: "youruser1",
        name: "CHANGE_ME",
        phoneNumber: "YOUR_PHONE_NUMBER"
    },
    {
        username: "youruser2",
        name: "CHANGE_ME",
        phoneNumber: "YOUR_PHONE_NUMBER"
    }
]

// Mock endpoint - think of it as one of your CRM's REST endpoints  
app.get('/getUser', async (req, res) => {
    let customerPhoneNumber = req.query.number

    for(let user of users) {
        if (user.phoneNumber == customerPhoneNumber) {
            res.send(user.name)
            return
        }
    }

    res.sendStatus(204)
})

app.post('/agent', async (req, res) => {
    let customerPhoneNumber = req.body.call.from;
    let customerName

    // Get the customer name from CRM
    try {
        let response = await axios.get(ngrok_url + '/getUser?number=' + customerPhoneNumber)

        if (response.status == 200) {
            customerName = response.data
            console.log("The customer's name is:", customerName);
        }

    } catch (error) {
        console.log(error)
    }

    let promptContext = ``

    if (customerName) {
        promptContext = `
            ## CONTEXT FOR THIS CALL
            The customer's phone number is: ${customerPhoneNumber}
            The customer's name is: ${customerName}
        `
    } else {
        promptContext = `
            ## CONTEXT FOR THIS CALL
            The customer's phone number is: ${customerPhoneNumber}
            You do not know the customer's name, as this number does not match any in our database.
        `
    }

    let basePrompt = `
        ## YOUR PERSONALITY
        You are Franklin, a virtual assistant that answers calls from customers. You are extra verbose while greeting customers.

        ## GUIDANCE
        Never deviate from this call flow.

        ## Call Flow
        ### Step 1
        Greet the customer by their name, if you know it. If not, still greet the customer, just don't use a name.
        Talk about the weather for a bit before asking how you can assist the caller.

        ### Step 2
        Hang up the call.
    `

    let swml = {
        sections: {
            main: [
                {
                    answer: {}
                },
                {
                    ai: {
                        prompt: {
                            text: promptContext + basePrompt                      
                        },
                    }
                }
            ]
        }
    }

    res.send(JSON.stringify(swml))
})

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});