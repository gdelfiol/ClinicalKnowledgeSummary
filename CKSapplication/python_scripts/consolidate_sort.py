import json

file1 = open('mesh_part1.json', 'r').read()
file2 = open('mesh_part2.json', 'r').read()

list1 = json.loads(file1)
list2 = json.loads(file2)

final_list = []
final_list.extend(list1)
final_list.extend(list2)

sorted_med_dis = sorted(final_list, key=lambda x: x['frequency'], reverse=True)

outputJSON = []

for o in sorted_med_dis:
	outputJSON.append(o['value'])

output_file = open('sorted_mesh.json', 'w')
output_file.write(json.dumps(outputJSON))