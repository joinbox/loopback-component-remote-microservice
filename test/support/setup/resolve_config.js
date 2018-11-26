const path = require('path');

module.exports = (environment = 'testing') => {
    const env = process.env.NODE_ENV || environment;
    const appRootDir = path.resolve(__dirname, '../server');
    const appBootDir = path.resolve(appRootDir, 'boot');
    return {
        appRootDir,
        bootDirs: [appBootDir],
        env,
    };
};
