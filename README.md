# SWML - AI - CRM Example

This example shows you how to fetch a given caller's name from your CRM, and then use that information to change the behaviour of your AI Agent, so it knows the customer's number and name.

## Usage

### Update the list of users
Add your own phone number and name to the list:
```json
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

```

### Build the container
```bash
docker build . -t swml 
```

### Run the container
```bash
docker run -it --name swml --env-file .env swml
```

### Update your SignalWire Phone Number settings
Change a Phone Number's settings to handle calls using `a SWML Script` box, and paste the URL youi'll get from your terminal.

### Call your SignalWire Phone Number
Just give your phone number a call, and watch the magic happen!