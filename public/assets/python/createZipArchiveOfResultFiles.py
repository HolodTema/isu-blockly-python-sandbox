import os
import zipfile

# 1. Определяем кортеж нужных расширений
target_extensions = ('.csv', '.json', '.txt')

# 2. Сканируем текущую директорию ('.')
# И отбираем только файлы, которые заканчиваются на нужные расширения
files_to_pack = [
    f for f in os.listdir('.')
    if f.endswith(target_extensions) and os.path.isfile(f)
]

if files_to_pack:
    archive_name = 'exported_files.zip'

    # 3. Создаем архив и упаковываем динамический список файлов
    with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filename in files_to_pack:
            zipf.write(filename)

