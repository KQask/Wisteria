const request = require('request-promise');

class Term {
    constructor() {
        this.terms = {};
        this.termID = '';
    }

    async getTerms() {
        const headers = {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        };

        const url = `https://reg-prod.ec.fhda.edu/StudentRegistrationSsb/ssb/classSearch/getTerms?searchTerm=&offset=1&max=100&_=${Date.now()}`;

        try {
            const response = await request.get({ url, headers, json: true });
            this.terms = response.reduce((acc, term) => {
                acc[term.description] = term.code;
                return acc;
            }, {});
        } catch (err) {
            console.error("Error getting terms. Error: ", err);
        }
    }

    buildTermId(term) {
        console.log("Building Term ID");
        let [year, quarter] = term.split(' ');
        let campus = term.includes('De Anza') ? '2' : '1';

        if (quarter === "Summer") {
            year++;
        }

        return `${year}${this.getQuarterCode(quarter)}${campus}`;
    }

    getQuarterCode(quarter) {
        const quarterCodes = {
            'Summer': '1',
            'Fall': '2',
            'Winter': '3',
            'Spring': '4'
        };
        return quarterCodes[quarter] || '';
    }

    async getTermByName(term) {
        await this.getTerms();
        this.termID = this.terms[term] || this.buildTermId(term);
    }
}

module.exports = Term;

/*
    Huge Thank you to Joshi for decoding this for me :)
    https://github.com/mljoshi/fhda-schedule-viewer/

    https://github.com/aandrewduong/veil-v2
    for most of the boiler plate code for this.
*/
