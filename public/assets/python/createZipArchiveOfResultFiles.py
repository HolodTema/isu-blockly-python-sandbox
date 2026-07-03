import os
import zipfile

target_extensions = ('.csv', '.json', '.txt')

files_to_pack = [
    f for f in os.listdir('.')
    if f.endswith(target_extensions) and os.path.isfile(f)
]

if files_to_pack:
    archive_name = 'exported_files.zip'

    with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filename in files_to_pack:
            zipf.write(filename)

