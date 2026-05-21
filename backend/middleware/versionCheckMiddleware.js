import AppConfig from '../models/AppConfig.js';
import { logger } from '../services/logger.js';

/**
 * Compare two semver strings (v1, v2)
 * Returns:
 *  - 1 if v1 > v2
 *  - -1 if v1 < v2
 *  - 0 if v1 == v2
 */
const compareVersions = (v1, v2) => {
    const s1 = v1.split('.').map(Number);
    const s2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
        const n1 = s1[i] || 0;
        const n2 = s2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
};

export const versionCheck = async (req, res, next) => {
    try {
        const clientVersion = req.headers['x-app-version'] || '1.0.0';
        const config = await AppConfig.getSingleton();
        const minVersion = config?.minAppVersion || '1.0.0';

        if (compareVersions(clientVersion, minVersion) < 0) {
            return res.status(426).json({
                success: false,
                message: "App update required",
                updateRequired: true,
                currentVersion: clientVersion,
                minVersion: minVersion
            });
        }

        // Maintenance Mode Check
        if (config?.maintenanceMode && !req.user?.role === 'admin') {
            return res.status(503).json({
                success: false,
                message: "System under maintenance. Please try again later.",
                maintenance: true
            });
        }

        next();
    } catch (error) {
        logger.error('Version check middleware error', { message: error.message });
        next(); // Fail open for version check to avoid blocking users if DB is slow
    }
};
