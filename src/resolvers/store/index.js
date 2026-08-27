const useMock = (process.env.DEFECT_ATLAS_MOCK || 'true') !== 'false';
module.exports = useMock ? require('./mockStore') : require('./realStore');
