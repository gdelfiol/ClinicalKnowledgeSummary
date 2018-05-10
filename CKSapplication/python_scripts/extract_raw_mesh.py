
import json
import requests
import time
import datetime

now = datetime.datetime.now()
start_year = now.year - 10
start_year = str(start_year)
current_year = now.year
current_year = str(current_year)

file = open('d'+current_year+'.bin', 'rb')
prob_list = []
med_list = []
data = file.readlines()

for line in data:
    try:
        line = line.decode('ascii')
    except:
        continue
    if (line[0:4] == 'MH ='):
        dis_med = line[5:len(line)]
        dis_med = dis_med.rstrip()
    if (line[0:4] == 'MN ='):
        if (line[5] == 'C'): #'C' for conditions and 'D' for medications/treatments and other descriptors
            if (any(x == dis_med for x in prob_list)):
                continue
            prob_list.append(dis_med)
            print(dis_med)
        if (line[5] == 'D'):
            if (any(x == dis_med for x in med_list)):
                continue
            med_list.append(dis_med)
            print(dis_med)

output_file1 = open('medications_mesh.json', 'w')
output_file1.write(json.dumps(med_list))
output_file2 = open('conditions_mesh.json', 'w')
output_file2.write(json.dumps(prob_list))