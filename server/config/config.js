var env = process.env.NODE_ENV || 'development';

if (env === 'development' || env === 'test') {
    var cfg = require('./config.json');

    var envCfg = cfg[env];

    Object.keys(envCfg).forEach((key) => {
        process.env[key] = envCfg[key];
    });
}
