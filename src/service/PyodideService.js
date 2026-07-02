export class PyodideService {
    constructor(state) {
        this.state = state;
        this.worker = null;
        this.isReady = false;
        this.pendingPromises = new Map(); // для обработки ответов с id
        this.messageId = 0;
        this.init();
    }

    init() {
        // Создаём воркер (файл должен быть доступен по пути)
        this.worker = new Worker('src/worker/pyodideWorker.js'); // путь относительно корня сайта

        this.worker.addEventListener('message', (event) => {
            const msg = event.data;
            // Обрабатываем системные сообщения
            if (msg.type === 'init') {
                this.isReady = true;
                console.log('Pyodide worker инициализирован');
                return;
            }
            if (msg.type === 'stdout') {
                // Вывод программы – отправляем в state
                const currentOutput = this.state.codeOutput || '';
                this.state.setCodeOutput(currentOutput + msg.payload);
                return;
            }
            if (msg.type === 'log') {
                console.log('[Pyodide worker]', msg.payload);
                return;
            }
            if (msg.type === 'error') {
                // Ошибка – показываем в выводе
                this.state.setCodeOutput(`Ошибка: ${msg.payload}`);
                return;
            }
            if (msg.type === 'zipReady') {
                // Получен zip-архив как ArrayBuffer
                const buffer = msg.payload;
                const blob = new Blob([buffer], { type: 'application/zip' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'result_files.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                return;
            }
            // Если есть id – резолвим промис
            if (msg.id !== undefined) {
                const resolver = this.pendingPromises.get(msg.id);
                if (resolver) {
                    if (msg.type === 'error') {
                        resolver.reject(new Error(msg.payload));
                    } else {
                        resolver.resolve(msg.payload);
                    }
                    this.pendingPromises.delete(msg.id);
                }
            }
        });

        // Отправляем команду init (можно не отправлять, воркер сам инициализируется)
        // this.sendCommand('init');
    }

    sendCommand(type, payload) {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;
            this.pendingPromises.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload });
        });
    }

    async runPythonCode(code) {
        console.log(code);
        if (!this.isReady) {
            await new Promise(resolve => {
                const check = () => {
                    if (this.isReady) resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }
        // Очищаем предыдущий вывод перед запуском?
        this.state.setCodeOutput('');
        await this.sendCommand('run', code);
        // Результат уже будет приходить через stdout, но можно дождаться завершения
        // await this.sendCommand('run', code); – но он не ждёт, потому что run не возвращает результата
        // Можно добавить специальное сообщение 'done', но пока не будем блокировать.
        // Однако если нужно дождаться окончания выполнения, можно добавить в воркер отправку 'done'
        // и здесь await.
        // В текущей реализации run не отправляет 'done', поэтому просто запускаем и выходим.
        // Для синхронизации можно посылать команду и ждать, пока воркер не пришлёт 'done'.
        // Я добавлю в воркер отправку 'done' после выполнения кода.
        // Тогда здесь можно раскомментировать await.
    }

    // Сохраняем файл в виртуальную ФС Pyodide
    saveInputFileToPyodideMemory(filename, byteArray) {
        // Отправляем ArrayBuffer (можно передать как Transferable)
        this.worker.postMessage({
            id: this.messageId++,
            type: 'loadFile',
            payload: { filename, data: byteArray.buffer }
        }, [byteArray.buffer]); // Transfer
    }

    removeInputFileFromPyodideMemory(filename) {
        this.sendCommand('removeFile', filename).catch(e => console.warn(e));
    }

    async saveResultFilesIntoZipArchive() {
        // Отправляем команду на создание zip, ответ придёт как zipReady
        await this.sendCommand('saveZip', null);
        // Воркер сам создаст и отправит zip, мы обработаем в обработчике сообщений
        return true; // или вернуть промис, который зарезолвится после отправки
    }

    // Для совместимости со старым кодом, если требуется синхронный запуск (не рекомендуется)
    runCurrentCodeFromWorkspace() {
        const code = this.state.generatedCode?.trim();
        if (!code) {
            this.state.setCodeOutput('# Пустая программа\n');
            return;
        }
        this.runPythonCode(code);
    }
}