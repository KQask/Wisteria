const request = require("request-promise-native").defaults({jar:true, followAllRedirects:true});
const cheerio = require("cheerio")
const crypto = require('crypto');
const Term = require("../utils/term");



class Auth_Session {
    constructor() {
        this.username = "";
        this.password = "";

        this.uniqueSessionId = '';

        this.SAMLResponse = "";
        this.RelayState = "";

        this.Attempts = 0;
        this.headers = {
            "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "content-type": "application/x-www-form-urlencoded",
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9", 
        }
    }

    generateRandomString(length) {
        return crypto.randomBytes(length).toString('hex').substring(0, length);
    }

    genSessionId() {
        this.uniqueSessionId = `${this.generateRandomString(5).toLowerCase()}${Date.now()}`;
        return null;
    }

    async Open_Homepage() {
        try {
            await request.get(`https://ssb-prod.ec.fhda.edu/ssomanager/saml/login?relayState=%2Fc%2Fauth%2FSSB%3Fpkg%3Dhttps%3A%2F%2Fssb-prod.ec.fhda.edu%2FPROD%2Ffhda_uportal.P_DeepLink_Post%3Fp_page%3Dbwskfreg.P_AltPin%26p_payload%3De30%3D`)
            .then(function (response) {
                console.log("Opened Homepage.")
            }).catch(function (err) {
                console.log(err);
            });
        } catch (err) {
            console.log(err);
        }
    }

    async Login() {
        this.Attempts++;
        try {
            const response = await request.post(`https://ssoshib.fhda.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s${this.Attempts}`, {
                form: {
                    j_username: this.username,
                    j_password: this.password,
                    _eventId_proceed: '',
                }, headers: this.headers
            });
            
            let $ = cheerio.load(response);
            $('div.alert.alert-danger').each((_, element) => {
                const message = $(element).text().trim();
                console.log(message);
                switch (message) {
                    case "The username you entered cannot be identified.":
                        console.log("Invalid Username");
                        process.exit();
                        break;
                    case "The password you entered was incorrect.":
                        console.log("Invalid Password");
                        console.log("halting execution.");
                        process.exit();
                        break;
                    case "You may be seeing this page because you used the Back button while browsing a secure web site or application. Alternatively, you may have mistakenly bookmarked the web login form instead of the actual web site you wanted to bookmark or used a link created by somebody else who made the same mistake.  Left unchecked, this can cause errors on some browsers or result in you returning to the web site you tried to leave, so this page is presented instead.":
                        console.log("Bad Session");
                        this.genSessionId();
                        break;
                    case "":
                        break;
                    default:
                        console.log(message);
                        this.Login();
                        break;
                }
            });
            this.SAMLResponse = $('input[name="SAMLResponse"]').val();
            this.RelayState = $('input[name="RelayState"]').val()

        } catch (err) {
            console.log("Error submitting login. Error: ", err);
        }
    }

    async SubmitCommon() {
        try {
            const response = await request.post("https://eis-prod.ec.fhda.edu/commonauth", {form: {
                "RelayState": this.RelayState,
                "SAMLResponse": this.SAMLResponse,
            }, headers:this.headers});

            let $ = cheerio.load(response);
            let message = '';
            $('div.retry-msg-text.text_right_custom').each((_, element) => {
                message = $(element).text().trim();
            });

            if (message.includes("Authentication Error!")) {
                console.log("");
            }


        this.RelayState = $("input[name='RelayState']").attr("value");
        this.SAMLResponse = $("input[name='SAMLResponse']").attr("value");

        } catch (err) {
            console.log("Error submitting Common Auth: ", err);
        }
    }

    async SubmitSSO() {
        try {
            const response = await request.post("https://ssb-prod.ec.fhda.edu/ssomanager/saml/SSO", {form: {
                "RelayState": this.RelayState,
                "SAMLResponse": this.SAMLResponse,
            }, headers:this.headers}).then(function (response) {
                console.log("Submitted SSO");
            })
        } catch (err) {
            console.log("Error submitting SSO, Error: ", err);
        }
        
    }


    async init() {
        await this.genSessionId();
        await this.Open_Homepage();
        await this.Login();
        await this.SubmitCommon();
        await this.SubmitSSO();
    }
}



class Registration extends Auth_Session{
    constructor(CRNs, username, password) {
        super();
        this.CRNs = CRNs;
        this.termID = 0;
        this.username = username, this.password = password;
        this.SAMLRequest = "";
        this.register_time = "";
    }

    async GetRegistration() {
        try {
            const response = await request.get("https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/ssb/registration/registerPostSignIn?mode=registration", {headers:this.headers});
            let $ = cheerio.load(response);
            this.SAMLRequest = $("input[name='SAMLRequest']").attr("value");
        } catch (err) {
            console.log(err);
        }
    }

    async SubmitSAMLSSO() {
        try {
            const response = await request.post("https://eis-prod.ec.fhda.edu/samlsso", {headers:this.headers, form: {
                "SAMLRequest": this.SAMLRequest,
            }})
            let $ = cheerio.load(response);
            this.SAMLResponse = $("input[name='SAMLResponse']").attr("value");
            console.log("Submitted SAMLSSO");
        } catch (err) {
            console.log(err);
        }
    }

    async SubmitSSB() {
        try {
            const response = await request.post("https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/saml/SSO/alias/registrationssb-prod-sp", {headers:this.headers,  form: {
                "SAMLResponse": this.SAMLResponse,
            }})
            let $ = cheerio.load(response);
            console.log("Submitted SSB");
            if ($('title').text() == "Select a Term") {
                console.log("Successfully logged in.")
            }
        } catch (err) {
            console.log(err);
        }
    }
/*
    End of Authentication, registration below.
*/


    async GetRegistrationStatus(Term_Season, Term_Year) {
        console.log("Unique session id: ", this.uniqueSessionId);
        const response = await request.get("https://ssb-prod.ec.fhda.edu/PROD/fhda_regstatus.P_RenderPage", {
            headers:this.headers
        })
        const $ = cheerio.load(response);
        $('li').each((index, element) => {
            const liText = $(element).text();
            if (liText.includes(Term_Year)) {
                if ((liText.toLowerCase()).includes(Term_Season.toLowerCase())) {
                    let parts = liText.split(' - ');
                    console.log('Found: ', parts[0]);
                    console.log('Registration time:', parts[1]);
                    const dateTime = new Date(parts[1]);
                    this.register_time = dateTime;
                    let term_info = new Term;
                    this.termID = term_info.buildTermId(parts[0]);
                    console.log("TermId:", this.termID);
                }
            }
        });
        if (this.termID == 0) {
            console.log("Failed to find Registration Window, are you sure it is available?");
            process.exit();
        }

    }

    

    async VisitRegistration() {
        try {
            const response = await request.post("https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/ssb/term/search?mode=registration", {headers:this.headers, form: {
                endDatepicker: "",
                startDatepicker: "",
                studyPath: "",
                studyPathText: "",
                term: this.termID,
                uniqueSessionId: this.uniqueSessionId,
            }});
        } catch (err) {
            console.log("Error visiting Registration. Err: ", err);
        }
    }

    async VisitClassRegistration() {
        try {
            const response = await request.head("https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/ssb/classRegistration/classRegistration", {headers:this.headers});
        } catch (err) {
            console.log("Error visiting class reg :)")
        }
    }


    async AddCRN(CRN) {
         try {
            console.log("Adding CRN: ", CRN);
            const response = await request.get(`https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/ssb/classRegistration/addRegistrationItem?term=${this.termID}&courseReferenceNumber=${CRN}&olr=false`, {
            headers:this.headers, json:true});
            let model = response.model;
            if (response.success) {
                const status = await this.SendBatch(model, CRN);
                if (!status) {
                    return false;
                } else return true;
            }

        } catch (err) {
            console.log("Error adding CRN Number: ", CRN);
            console.log(err);
        }
    }

    async SendBatch(CRNModel, CRN) {
        try {
            const response = await request.post("https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/ssb/classRegistration/submitRegistration/batch", {headers:this.headers,
            form:{
                Update: CRNModel,
                UniqueSessionId: this.uniqueSessionId,
            }, json:true})
            let i = 0;
            response.data.update.forEach(element => {
                if (element.statusDescription == "Registered") {
                    console.log("Successfully registered for CRN: ", CRN)
                    return true;
                } else if (element.statusDescription == "Waitlisted") {
                    console.log("Added to Waitlist for CRN: ", CRN);
                    return true;
                } else if (element.statusDescription == "Errors Preventing Registration") {
                    console.log(`Error adding the CRN ${CRN}:\n${element.crnErrors[0].message}`);
                    return false;
                }
            });
        } catch (err) {
            console.log(err);
            return false;
        }
    }
    async AddCRNs() {
        let allAdded = false;
        while (!allAdded) {
            allAdded = true;
            for (const course of this.CRNs) {
                const status = await this.AddCRN(course);
                if (!status) {
                    console.log("Failure to add CRN: ", course);
                    allAdded = false; 
                }
            }
            if (!allAdded) {
                console.log("Retrying to add all CRNs...");
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        console.log("All CRNs added successfully.");
    }

    async GetAuthentication() {
        try {
            const response = await request.get("https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/login/authAjax", {headers:this.headers});
            if (response == 'userNotLoggedIn') {
                console.log("Error, User is not logged in.");
                return false;
            } else {
                console.log("User logged in!");
                return true;
            }
        } catch (err) {
            console.log("Error retrieving authentication status, Err: ", err);
        }
        return false;
    }


    async CreateSession() {
        await this.init();
        await this.GetRegistration();
        await this.SubmitSAMLSSO();
        await this.SubmitSSB();

    }

    async UpdateSession(Choice, Term_Season, Term_Year) {
        if (!await this.GetAuthentication()) {
            console.log("Generating a New Session.");
            await this.CreateSession();
            await this.GetRegistrationStatus(Term_Season, Term_Year);
            await this.VisitRegistration();
            await this.VisitClassRegistration();
        } else {
            console.log("Authenticated.");
        }
    }

    async start(Choice, Term_Season, Term_Year) {
        await this.UpdateSession(Choice, Term_Season, Term_Year);
        const now = new Date();
        const targetTime = new Date(this.register_time);
        console.log(Term_Year);
        setInterval(async () => {
            await this.UpdateSession(Choice, Term_Season, Term_Year);
        }, 1 * 60 * 1000);

        if (now < targetTime) {
            const timeDifference = targetTime.getTime() - now.getTime();
            setTimeout(async () => {
                await this.AddCRNs();
            }, timeDifference);
        } else {
            console.log("Executing addCRNS");
            await this.AddCRNs();
        }
    }
}


module.exports = Registration;