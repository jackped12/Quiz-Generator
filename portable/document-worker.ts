import {parentPort,workerData} from 'node:worker_threads';
import {extractDocument} from './documents';
void extractDocument(workerData.name,Buffer.from(workerData.bytes)).then(
 source=>parentPort?.postMessage({source}),
 error=>parentPort?.postMessage({error:error instanceof Error?error.message:'Could not read document.'})
);
