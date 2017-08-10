var Alexa = require('alexa-sdk');
var https = require('https');

var MSG = { WELCOME:'Welcome to Tech Calendar. Ask for upcoming tech events in your city this week, next week or on a specific date.',
            HELP:"Try asking what's on in your city.",
            HELP_REPROMPT: "Sorry i didn't catch that.",
            STOP: 'Thanks for using Open Tech Calendar. Enjoy your next event!',
            UNAVAILABLE:"Sorry, we were unable to find any events right now. Please try again later.",
            TRY_AGAIN: "I'm sorry, I didn't understand that. Try asking what's on in your city or on a certain date."
};

var API_URL = { HOST:'https://opentechcalendar.co.uk',
                GB_EVENTS: '/api1/country/GB/events.json',
                CITY_EVENTS: '/api1/area/'
};


exports.handler = function(event, context, callback) {

    var alexa = Alexa.handler(event, context);

    alexa.registerHandlers(handlers);
    alexa.execute();
    
};


var handlers = {
    
    // Skill Intents
    
    'GetEventsByDate': function(){
        var placeName = getPlaceName(this.event); 
        var dateRange = getDateRange(this.event); 
    
        if(!dateRange){
            this.emit(':ask',MSG.TRY_AGAIN);
            return false;
        }
        
        var comparisonDates = false;
        
        if(dateRange){
            comparisonDates = getComparisonDates(dateRange);
        }
    
        var eventsJSON = null;
        var eventSpeechOut = 'There are no known events '+getEventSpeechNoEvents(comparisonDates, placeName);
        var that = this;
        getLocationEvents(placeName, function(response){
            if(response){
                try{
                    eventsJSON = JSON.parse(response);
                } catch(e){
                    that.emit(':tell', MSG.UNAVAILABLE);
                    return false;
                }
                
                var noEvents = eventsJSON.data.length
                if(noEvents>0){
                    var eventText = parseToSpeech(eventsJSON.data, comparisonDates, false);
                    if(eventText!==''){
                        eventSpeechOut = getEventSpeech(comparisonDates, placeName);
                        eventSpeechOut += eventText;
                    }
                }
                that.emit(':tell',eventSpeechOut);
                
            } else {
                that.emit(':tell', MSG.UNAVAILABLE);
            }
        });
        return true;
    },
    
    'GetNextEvents': function(){
        var eventsJSON = null;
        var eventSpeechOut = 'The following events are coming up next around the UK.';
        var that = this;
        getGBEventsJson(function(response){
            if(response){
                try{
                    eventsJSON = JSON.parse(response);
                } catch(e){
                    that.emit(':tell', MSG.UNAVAILABLE);
                    return false;
                }
                eventSpeechOut = parseToSpeech(eventsJSON.data, false, false);
                that.emit(':tell',eventSpeechOut);
                
            } else {
                that.emit(':tell', MSG.UNAVAILABLE);
            }
        });
        return true;
        
    },
    
    'GetNextEventsIn': function(){
        var placeName = getPlaceName(this.event); 
        if(!placeName){
            this.emit(':ask',MSG.TRY_AGAIN);
            return false;
        }
        var eventsJSON = null;
        var eventSpeechOut = 'There are no known upcoming events in '+placeName;
        var that = this;
        getLocationEvents(placeName, function(response){
            if(response){
                try{
                    eventsJSON = JSON.parse(response);
                } catch(e){
                    that.emit(':tell', MSG.UNAVAILABLE);
                    return false;
                }
                var noEvents = eventsJSON.data.length
                if(noEvents>0){
                    var eventText = parseToSpeech(eventsJSON.data, false, false, true);
                    if(eventText!==''){
                        eventSpeechOut = 'The following events are coming up soon in '+placeName;
                        eventSpeechOut += eventText;
                    }
                }
                that.emit(':tell',eventSpeechOut);
                
            } else {
                that.emit(':tell', MSG.UNAVAILABLE);
            }
        });
        return true;
    },
    
    // Standard Intents
    
    'LaunchRequest': function () {
        this.emit(':ask', MSG.WELCOME);
    },

    'AMAZON.HelpIntent': function () {
        this.emit(':ask', MSG.HELP, MSG.HELP_REPROMPT);
    },
    
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', MSG.STOP);
    },
    
    'AMAZON.StopIntent': function () {
        this.emit(':tell', MSG.STOP);
    }
};

function getPlaceName(e){
    if(e.request.intent.slots.placeName.value){
        return e.request.intent.slots.placeName.value.toLowerCase();
    }
    return false;
}

function getDateRange(e){
    if(e.request.intent.slots.dateRange.value){
        return e.request.intent.slots.dateRange.value;
    }
    return false;
}

function getEventSpeech(comparisonDates, placeName){
    var speechDateText = '';
    var speechDate = getSpeechEventDate(comparisonDates.startDate);
    switch(comparisonDates.rangeType){
        case 'day':
            speechDateText = 'The following events are on <say-as interpret-as="date" format="md">'+speechDate+'</say-as>';
        break;
        case 'week':
            speechDateText = 'The following events are on during the week commencing <say-as interpret-as="date" format="md">'+speechDate+'</say-as>';
        break;
        case 'weekend':
            speechDateText = 'The following events are on during the weekend commencing <say-as interpret-as="date" format="md">'+speechDate+'</say-as>';
        break;
    }
    
    if(placeName){
         speechDateText += ' in '+placeName+'.';
    } else {
        speechDateText += '.';
    }
        
    return speechDateText;
}

function getEventSpeechNoEvents(comparisonDates, placeName){
    var speechDateText = '';
    var speechDate = getSpeechEventDate(comparisonDates.startDate);
    switch(comparisonDates.rangeType){
        case 'day':
            speechDateText = '<say-as interpret-as="date" format="md">'+speechDate+'</say-as>';
        break;
        case 'week':
            speechDateText = 'during the week commencing <say-as interpret-as="date" format="md">'+speechDate+'</say-as>';
        break;
        case 'weekend':
            speechDateText = 'during the weekend commencing <say-as interpret-as="date" format="md">'+speechDate+'</say-as>';
        break;
        
        if(placeName){
             speechDateText += ' in '+placeName+'.';
        } else {
            speechDateText += '.';
        }
    }
    return speechDateText;
}
function getGBEventsJson(cb){
    
    var requestUrl =  API_URL.HOST+API_URL.GB_EVENTS;
    https.get(requestUrl, function(res){
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            cb(returnData);

        });
    });

}



function getLocationEvents(placeName, cb){
    if(placeName){
         getPlaceCode(placeName, function(placeCode){
            if(placeCode){
                getLocationEventsJson(placeCode, cb);
            } else {
                cb(false);
            }
            
        });
    } else {
        getLocationEventsJson(false, cb);
    }
   
}

function getPlaceCode(placeName, cb){
    getPlacesByName(function(placesByName){
        if(placesByName[placeName]){
            cb(placesByName[placeName].placeCode);
        } else {
            cb(false);
        }
    });
    
}

function getPlacesByName(cb){
    
    var placesJson = [];
    
    var scotlandPlacesJSON = [];
    var englandPlacesJSON = [];
    var walesPlacesJSON = [];
    var nIplacesJSON = [];
    
    var placesByName = null;
    var recieved = 0;
    
    getPlacesJson(59, function(response){
            if(response){
                scotlandPlacesJSON = JSON.parse(response);
                recieved++;
                if(recieved===4){
                    placesByName = combineByName(scotlandPlacesJSON,englandPlacesJSON,walesPlacesJSON,nIplacesJSON);
                    cb(placesByName);  
                }
            } else {
               that.emit(':tell', MSG.UNAVAILABLE);
            }
    });
    
    getPlacesJson(1, function(response){
            if(response){
                englandPlacesJSON = JSON.parse(response);
                recieved++;
                if(recieved===4){
                    placesByName = combineByName(scotlandPlacesJSON,englandPlacesJSON,walesPlacesJSON,nIplacesJSON);
                    cb(placesByName);  
                }
            } else {
                that.emit(':tell', MSG.UNAVAILABLE);
            }
    });
    
    getPlacesJson(53, function(response){
            if(response){
                walesPlacesJSON = JSON.parse(response);
                recieved++;
                if(recieved===4){
                    placesByName = combineByName(scotlandPlacesJSON,englandPlacesJSON,walesPlacesJSON,nIplacesJSON);
                    cb(placesByName);  
                }
            } else {
                that.emit(':tell', MSG.UNAVAILABLE);
            }
    });
    
    getPlacesJson(70, function(response){
            if(response){
                nIplacesJSON = JSON.parse(response);
                recieved++;
                if(recieved===4){
                    placesByName = combineByName(scotlandPlacesJSON,englandPlacesJSON,walesPlacesJSON,nIplacesJSON);
                    cb(placesByName);  
                }
            } else {
                that.emit(':tell', MSG.UNAVAILABLE);
            }
    });
}

function combineByName(scotlandPlacesJSON,englandPlacesJSON,walesPlacesJSON,nIplacesJSON){
    var placesJSON = [];
    
        placesJSON = placesJSON.concat(scotlandPlacesJSON.childAreas,englandPlacesJSON.childAreas,walesPlacesJSON.childAreas,nIplacesJSON.childAreas);
    var placesByName = sortPlacesByName(placesJSON);
    return placesByName; 
}

function sortPlacesByName(placeArray){
    
    var placesByName = [];
    var noPlaces = placeArray.length;
    
    for(var i = 0; i < noPlaces ; i++){
        var placeName = placeArray[i].title.toLowerCase();
        var placeCode = placeArray[i].slug;
        placesByName[placeName] = {
                                    placeName: placeName,
                                    placeCode: placeCode
                                };
    }
    
    return placesByName;
}

function getPlacesJson(placeCode, cb){
    
    var requestUrl =  API_URL.HOST+'/area/'+placeCode+'/info.json';
    
    https.get(requestUrl, function(res){
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            cb(returnData);

        });
    });

}

function getLocationEventsJson(placeCode, cb){

    if(placeCode){
        var requestUrl = API_URL.HOST+'/api1/area/'+placeCode+'/events.json';
    } else {
        var requestUrl = API_URL.HOST+API_URL.GB_EVENTS;
    }

    https.get(requestUrl, function(res){
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            cb(returnData);

        });
    });

}

function parseToSpeech(eventData, comparisonDates, useCity, useDate){
    var noEvents = eventData.length;
    var maxEvents = 10;
    var speech = "";
    
    for(var i = 0; i < noEvents ; i++){
        
        var calEvent = eventData[i];
        if(calEvent.summary){
            var summary = calEvent.summary.replace(/[^\w\s]/gi, '');
            var eventTimestamp = calEvent.start.rfc2882utc;
            var eventDate = new Date(eventTimestamp);
            if(dateIsInRange(eventDate, comparisonDates)||(comparisonDates===false)){
                
                var speechDay = getSpeechDay(eventDate);
                var speechDateText = '';
                
                if(comparisonDates!==false){
                    switch(comparisonDates.rangeType){
                        case 'day':
                            speechDateText = '';
                        break;
                        case 'week':
                            speechDateText = 'On '+speechDay+', ';
                        break;
                        case 'weekend':
                            speechDateText = 'On '+speechDay+', ';
                        break; 
                    }
                }
                
                var speechLocation = getSpeechLocation(calEvent, useCity);
                
                var eventPhrase = '<p>'+speechDateText + summary + speechLocation+'</p>';
                var newSpeech = speech + eventPhrase;
                if(newSpeech.length<8000){
                    speech += eventPhrase;
                } else {
                    break;
                }
                
            }
            
        }
    
    }
    
    return speech;
}

function getComparisonDates(dateRange){
    
    if(dateRange.indexOf('WE')>-1){
        console.log('weekend date range');
        return getWeekendRange(dateRange);
    };
    
    if(dateRange.indexOf('W')===5){
        console.log('week of year range');
        return getWeekRange(dateRange);
    };
    
    if(dateRange.length===10){
        console.log('specific date');
        return getDayRange(dateRange);
    }
}

function getWeekendRange(dateRange){
    
    var yearWeek = getYearWeek(dateRange);
    console.log(yearWeek);
    var satDate = new Date(yearWeek.weekStartDate.getTime()); 
        satDate.setDate(satDate.getDate() + 5);
    var sunDate = new Date(satDate.getTime()); 
        sunDate.setDate(sunDate.getDate() + 1);
    return {startDate:satDate,
            endDate:sunDate,
            rangeType: 'weekend'
    };
}

function getWeekRange(dateRange){
    
    var yearWeek = getYearWeek(dateRange);
    console.log(yearWeek);
    console.log(yearWeek.weekStartDate);
    var monDate = new Date(yearWeek.weekStartDate.getTime()); 
    var sunDate = new Date(yearWeek.weekStartDate.getTime()); 
        sunDate.setDate(monDate.getDate() + 6);
        
    return {startDate:monDate,
            endDate:sunDate,
            rangeType: 'week'};
}

function getDayRange(dateRange){
    var dateParts = dateRange.split('-');
    var monthNo = parseInt(dateParts[1])-1;
    var d = new Date(dateParts[0],monthNo,dateParts[2]);
    var startDate = new Date(d.getTime()); 
    var endDate = new Date(d.getTime()); 
        endDate.setHours(23);
        endDate.setMinutes(59);
     return {startDate:startDate,
            endDate:endDate,
            rangeType: 'day'};
}

function getYearWeek(dateRange){
    var yearWeek = {};
    var dateRangeParts = dateRange.split('-');
    yearWeek.year = dateRangeParts[0];
    yearWeek.week = dateRangeParts[1];
    yearWeek.week = yearWeek.week.replace('W', '');
    yearWeek.week = parseInt(yearWeek.week);
    
    yearWeek.weekStartDate =  getDateOfISOWeek(yearWeek.week,  yearWeek.year);
    
    
    return yearWeek;
    
}

function getDateOfISOWeek(w, y) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function getMondayOfWeek(d){
    var day = d.getDay();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day == 0 ?-6:1)-day );
}

function getSaturdayOfWeek(d){
    var day = d.getDay();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day == 0? 0:6)-day );
}

function getSundayOfWeek(d){
    var day = d.getDay();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day == 0?0:7)-day );
}

function dateIsInRange(eventDate, dates){
    if(!dates){
        return false;
    };
    if((eventDate>=dates.startDate)&&(eventDate<=dates.endDate)){
        return true;
    };
}

function getSpeechDay(eventDate){
    
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var speechDay = days[eventDate.getDay()];
    return speechDay;
}

function getSpeechEventDate(eventDate){

    var day = eventDate.getDate();
    var monthIndex = eventDate.getMonth();
        monthIndex++;

    var speechDate = String(monthIndex)+'/'+String(day);

    return speechDate;
    
}

function getSpeechLocation(calEvent, useCity){
    var speechLocation = '';
    var venue = '';
    var address = '';
    
    if(calEvent.venue){
        venue = ' is on at '+calEvent.venue.title +', ';
        address = calEvent.venue.address;
    }
    
    var area = calEvent.areas[0].title;
    
    if(address=='' && venue==''){
        return '';
    };
    
    if(useCity){
        speechLocation = venue + address + ' in ' + area;
    } else {
        speechLocation = venue + address;
    };
    
    return speechLocation;
}