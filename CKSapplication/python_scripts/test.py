# Perform a GET on patient with id of 'cf-1499698397063'
import requests

url_fhir = 'https://api.hspconsortium.org/MyFirst/open'
PatientID = 'SMART-1288992'
url = url_fhir+"/Patient"#+PatientID
data1 = {"resourceType": "Patient", "meta": { "versionId": "1", "lastUpdated": "2018-03-27T22:20:53.600+00:00"},"text": {"status": "generated","div": "<div xmlns='http://www.w3.org/1999/xhtml'>Molly Robinson</div>"},"name": [{"use": "official","text": "Molly Robinson","family": "Robinson","given": ["Molly"]}],"gender": "female","birthDate": "1979-05-13"}
#headers = {'Content-Type': 'application/json'}
Px = requests.post(url+'', json = data1);
print(Px.text)
