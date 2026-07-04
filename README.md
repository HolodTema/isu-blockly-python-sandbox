# Визуальный конструктор кода для сборки и подготовки данных

Аналог Scratch или trinket.io для сбора и предобработки данных. Событийно-ориентированное
программирование при помощи drag-and-drop блоков кода, которые автоматически конвертируются
в python и методы библиотек pandas, requests, json. Возможность выполнения и отладки
сгенерированного python-кода на сервере. Импорт-экспорт проекта в файл. Возможность создания
аккаунта для сохранения созданных проектов на сервере.

# Используемые технологии

Frontend: Html, CSS, Vanila JS, Pyodide, CodeMirror, Blockly

# Как добавлять новые блоки

### 1. Добавить блок в public/assets/blockly/blocks.json

Добавляются по правилам из документации Blockly. 

Расскажу кратко:

При помощи параметров JSON messageN и argN задается текст и места крепления
блоков. 

previousStatement - крепление блока вверху. Может быть null для любого блока или строкой для валидации прикрепляемого блока.

nextStatement - крепление блока снизу. Может быть null для любого блока или
строкой для валидации прикрепляемого блока.

output - крепление блока слева, возвращаемое значение блока.

input - это поле находится внутри поля argN и отвечает за крепления блоков 
справа или посередине блока.

-----------------------

Пример блока в blocks.json - блок print()

```json
{
    "type": "print_block",
    "message0": "напечатать %1",
    "args0": [
        {
            "type": "input_value",
            "name": "TEXT"
        }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Печатает текст в консоль"
},
```

### 2. Добавить созданный блок в тулбокс - в файл /public/assets/blockly/toolbox.json

Файл toolbox.json отвечает за тулбокс - список, откуда пользователь достает
блоки для работы. Файл разделен на категории блоков. Нужно добавить в 
список блоков категории созданный блок.

```json
{
      "kind": "category",
      "name": "Pandas",
      "colour": "#9C27B0",
      "contents": [
        { "kind": "block", "type": "pandas_import_block" },
        { "kind": "block", "type": "pandas_read_html_block" },
        { "kind": "block", "type": "pandas_concat_block" },
        { "kind": "block", "type": "pandas_head_n_block" },
        { "kind": "block", "type": "pandas_tail_n_block" },
        { "kind": "block", "type": "pandas_append_to_list_block" },
        { "kind": "block", "type": "pandas_to_csv_block" },
        { "kind": "block", "type": "pandas_info_block" }
      ]
    }
}
```

### 3. Написать JS-функцию, которая возвращает Python-код из нашего блока

Это делается в файле /src/service/BlocklyService.js в методе 
configureCodeGenerator()

```js
export default class BlocklyService {
    //...

    configureCodeGenerator() {
        //...
        pythonGenerator.forBlock["block_name"] = function(block) {
            return "some python code";
        }
    }
}
```
