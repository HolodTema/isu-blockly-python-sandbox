import {useEffect, useState , useCallback,useRef} from "react";
import { PyodideWorkerClient } from "./coderApi";

export function useCodeRunner() {
    const [output,setOutput] = useState("");
    const clientRef = useRef<PyodideWorkerClient | undefined>(undefined);
    
    useEffect(() => {
        clientRef.current = new PyodideWorkerClient((chunk)=> setOutput(prevOutput => prevOutput + chunk));
        return () => clientRef.current?.dispose();

    },[]);

    const runCode = useCallback( async (code: string) => {
        if (!code.trim()) return setOutput("Пустая программа");
        setOutput("");
                try {
            await clientRef.current!.run(code);
        } catch (e) {
            setOutput(`Runtime error: ${(e as Error).message}`);
        }
    }, []);

    return { output, runCode, client: clientRef.current };
}    
 
