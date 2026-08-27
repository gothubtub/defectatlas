// Single switch point between the mocked and real Jira clients. Defaults
// to mock (this build's chosen scope — see README "Build scope"); set the
// DEFECT_ATLAS_MOCK Forge environment variable to "false" to flip a
// deployed environment onto realClient.js once a site is available.
const useMock = (process.env.DEFECT_ATLAS_MOCK || 'true') !== 'false';
module.exports = useMock ? require('./mockClient') : require('./realClient');
