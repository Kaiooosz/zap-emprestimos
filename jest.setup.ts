// jest.setup.ts — configurações globais de teste

// Reset de mocks entre testes é feito via jest.config.ts (clearMocks, resetMocks, restoreMocks)
// Este arquivo fica disponível para futuras configurações globais (ex: variáveis de ambiente de teste)

// NODE_ENV é readonly no TypeScript; definir via Object.defineProperty para testes
Object.defineProperty(process.env, "NODE_ENV", { value: "test", writable: false });
process.env.JWT_SECRET = "test-secret-zap-2026";
