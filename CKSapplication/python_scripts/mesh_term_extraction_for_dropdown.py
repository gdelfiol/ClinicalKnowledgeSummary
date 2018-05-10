
import json
import requests
import time
import datetime


now = datetime.datetime.now()
start_year = now.year - 10
start_year = str(start_year)
current_year = now.year
current_year = str(current_year)
url_first = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=100000&term='
url_last = '[MeSH+Terms]+AND+((\"therapy\"[Subheading]+AND+systematic[sb]+AND+(\"systematic+review\"[ti]+OR+\"meta-analysis\"[ti]+OR+\"Cochrane+Database+Syst+Rev\"[journal]))+OR+(Therapy/Narrow[filter]+NOT+(systematic[sb]+OR+\"systematic+review\"[ti]+OR+\"meta-analysis\"[ti]+OR+\"Cochrane+Database+Syst+Rev\"[journal])))+AND+('+start_year+':'+current_year+'[pdat])+AND+(\"english\"[language]+AND+hasabstract[text]+AND+jsubsetaim[text]+AND+\"humans\"[MeSH Terms])'
ks_url = 'http://service.oib.utah.edu:8080/KnowledgeSummary/json'

# Go to https://www.nlm.nih.gov/mesh/download_mesh.html for the latest d<year>.bin files

# Formats the query sent to the KS api
# @param:pubmedIDs => list of relevant pubmed ids
def formatKSquery(pubmedids):
	if(len(pubmedids) == 0):
		return -1
	inputs = '['
	for m in range(len(pubmedids)):
		if (m == len(pubmedids) - 1):
			inputs  += '"' + pubmedids[m] + '"]'
		else:
			inputs  += '"' + pubmedids[m] + '",'
	return inputs

# Calls the knowledge summary api to receive a json of needed information
# @param:input => query string needed for post call
def ksQuery(inputs):
	headers = { 'Content-Type': 'application/json;charset=utf-8' }
	r = requests.post(ks_url, data=inputs, headers=headers)
	return r.content

# To get the number of relevant articles on the MeSH term by using PubMed e-utils
def countFrequency (text):
	time.sleep(1)
	keyword = meshWithPlus(text)
	url = url_first + keyword + url_last
	try:
		results = requests.get(url)
		results = json.loads(results.content.decode('utf-8'))
		if(results['esearchresult']['count'] != 0):
			query = formatKSquery(results['esearchresult']['idlist'])
			results2 = ksQuery(query)
			results2 = json.loads(results2)
			return len(results2[0]['feed'])
			#frequency = results['esearchresult']['count']
			#return frequency
		else:
			return 0
	except:
		return -1

# this is to generate Mesh terms by concatenating by using plus(+) character
# If MeSh terms are not concatenated by the plus character, e-utils does not return any results
def meshWithPlus(text):
    temp = text.split(" ")
    newMesh = ""
    length = len (temp)
    if length == 1 :
        newMesh = temp[0]
    elif length > 1 :
        num = 1
        for i in temp :
            if num == length :
                newMesh = newMesh + str(i)
            else :
                newMesh = newMesh + str(i) + "+"
            num = num + 1
    return newMesh

file = open('d'+current_year+'.bin', 'rb')
prob_med_list = []
data = file.readlines()

for line in data[:400009]:
# for line in data[400009:]: # I needed to split the file in half to process it
	try:
		line = line.decode('ascii')
	except:
		continue
	if (line[0:4] == 'MH ='):
		dis_med = line[5:len(line)]
		dis_med = dis_med.rstrip()
	if (line[0:4] == 'MN ='):
		if (line[5] == 'C' or line[5] == 'D'): #'C' for conditions and 'D' for medications/treatments and other descriptors
			if (any(x['value'] == dis_med for x in prob_med_list)):
				continue
			freq = countFrequency(dis_med)
			if(freq == -1):
				continue
			if (freq != 0):
				print(dis_med)
				prob_med_list.append({ 'value': dis_med, 'frequency': freq })

output_file = open('mesh_part1.json', 'w')
# output_file = open('mesh_part2.json', 'w')
output_file.write(json.dumps(prob_med_list))

# After creating both files, run 'consolidate_sort.py'