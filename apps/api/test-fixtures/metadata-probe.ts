// Проверка для tooling.spec.ts: эмитит ли запускатель run:ts метаданные декораторов (как tsc у Nest).
import 'reflect-metadata';

class Dependency {}

function Marker(): ClassDecorator {
  return () => undefined;
}

@Marker()
class Probe {
  constructor(readonly dependency: Dependency) {}
}

const types: unknown[] | undefined = Reflect.getMetadata('design:paramtypes', Probe);
console.log(types?.[0] === Dependency ? 'metadata-ok' : 'metadata-missing');
