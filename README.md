# An Alexa Skill for Open Tech Calendar. 

This is the code for the Tech Calendar Alexa Skill:
https://www.amazon.co.uk/dp/B074CDRLSY

Data is from the Open Tech Calendar API:
https://opentechcalendar.co.uk

To add your own events for free just visit the website above.

# About This Project

This skill was created as a long weekend project to learn Alexa skill development and hopefully create something useful for the UK tech scene at the same time. 

The code is shared in the spirit of open source to help others learn and any suggestions or contributions are welcome.

Currently the skill only works for UK cities as the names can be easily recognised by Alexa.

# Intents

Intents are the entry points to the code. When Alexa recognizes a phrase it will parse the data from the audio and make a call to one of the Intent handlers.

Certain types of data such as Cities and Dates are defined as Slots which can be though of as parameters and accessed within the handler code in much the same way as HTTP POST or GET data is recieved by the back end of a website.

GetNextEvents - Recieve no parameters. Responds with upcoming UK events.

GetNextEventsIn - Recieves a UK place name. Responds with upcoming UK events from the specified place.

GetEventsByDate - Recieves a UK place name place name and date or date range (such as next week). Responds with events from the specified place filtered by date range.

# The Future 

Potential improvements:

Alexa, when is the next *event name in *place name*?
Alexa, tell me more about *event name*

