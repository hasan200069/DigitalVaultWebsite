declare module 'secrets.js' {
  interface SecretsJS {
    share(secret: string, numShares: number, threshold: number, padLength?: number): string[];
    combine(shares: string[]): string;
    newShare(id: number | string, shares: string[]): string;
    init(bits?: number): void;
    setRNG(rng: () => number): void;
    random(bits: number): string;
    str2hex(str: string): string;
    hex2str(hex: string): string;
    getConfig(): { bits: number };
  }

  const secrets: SecretsJS;
  export default secrets;
}
