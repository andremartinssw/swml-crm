require('dotenv').config();
const ngrok = require('ngrok');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const jsforce = require('jsforce');

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

// Connect to Salesforce using jsforce
const conn = new jsforce.Connection({
    oauth2: {
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        redirectUri: process.env.SALESFORCE_CALLBACK_URL
    }
});

let username = process.env.SALESFORCE_USERNAME;
let password = process.env.SALESFORCE_PASSWORD;
let securityToken = process.env.SALESFORCE_SECURITY_TOKEN;

conn.login(username, password + securityToken);

app.get('/getUser', async (req, res) => {
    let customerPhoneNumber = req.query.number
    console.log(customerPhoneNumber);

    try {
        const result = await conn.query(
            `
            SELECT Name 
            FROM Contact 
            WHERE Phone = '${customerPhoneNumber}' 
            LIMIT 1
            `
        );
        
        if (result.totalSize > 0) {
            const user = result.records[0];
            res.send(user.Name);
            return;
        }

    } catch (error) {
        console.log(error);
    }

    res.sendStatus(204);
})

app.post('/agent', async (req, res) => {
    let customersPhoneNumber = req.body.call.from;

    // Get the customer name from CRM - in this case, Salesforce
    try {
        let response = await axios.get(
            ngrok_url + '/getUser', 
            {
                params: {
                    number: customersPhoneNumber
                }
            }
        )

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
            The customer's phone number is: ${customersPhoneNumber}
            The customer's name is: ${customerName}
        `
    } else {
        promptContext = `
            ## CONTEXT FOR THIS CALL
            The customer's phone number is: ${customersPhoneNumber}
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

    res.json(swml)
})

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});