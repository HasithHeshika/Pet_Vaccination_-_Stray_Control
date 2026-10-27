// AI comparison of a found pet with a candidate (lost report or registered pet).
//
// Contract every provider implements:
//   compare({ found, candidate, candidateType }) -> Promise<{
//     verdict: 'high' | 'possible' | 'unlikely' | null,
//     score:   0-100 or null,
//     reasons: string[],
//     model:   string | undefined
//   }>
// `found` and `candidate` are plain objects with the report / pet fields, including photos
// (base64 data URLs or http links). Select the provider with MATCH_AI_PROVIDER.
//
// Only the "none" provider exists today; an Azure OpenAI or Claude provider is added here later.

const noneProvider = {
  name: 'none',
  async compare() {
    return { verdict: null, score: null, reasons: ['AI matching is not configured yet'], model: undefined };
  }
};

const providers = {
  none: noneProvider
};

const getProvider = () => {
  const name = (process.env.MATCH_AI_PROVIDER || 'none').toLowerCase();
  if (!providers[name]) {
    console.warn(`Unknown MATCH_AI_PROVIDER "${name}", using "none"`);
    return noneProvider;
  }
  return providers[name];
};

module.exports = { getProvider };
