module.exports = {
    apps: [
        {
            name: "GlamSync",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3003 -H 127.0.0.1",
            cwd: "/var/www/glamsync.app/frontend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
            },

            error_file: "/var/www/glamsync.app/logs/frontend/app-error.log",
            out_file: "/var/www/glamsync.app/logs/frontend/app-out.log",
            log_file: "/var/www/glamsync.app/logs/frontend/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "GlamSync-API",
            script: "index.js",
            cwd: "/var/www/glamsync.app/backend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3005,
            },

            error_file: "/var/www/glamsync.app/logs/backend/api-error.log",
            out_file: "/var/www/glamsync.app/logs/backend/api-out.log",
            log_file: "/var/www/glamsync.app/logs/backend/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "UniEcho",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3007 -H 127.0.0.1",
            cwd: "/var/www/uniecho.io/frontend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
            },

            error_file: "/var/www/uniecho.io/logs/frontend/app-error.log",
            out_file: "/var/www/uniecho.io/logs/frontend/app-out.log",
            log_file: "/var/www/uniecho.io/logs/frontend/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "UniEcho-API",
            script: "dist/server.js",
            cwd: "/var/www/uniecho.io/backend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3009,
            },

            error_file: "/var/www/uniecho.io/logs/backend/api-error.log",
            out_file: "/var/www/uniecho.io/logs/backend/api-out.log",
            log_file: "/var/www/uniecho.io/logs/backend/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "SanjoyC",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3011 -H 127.0.0.1",
            cwd: "/var/www/sanjoyc.com/frontend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
            },

            error_file: "/var/www/sanjoyc.com/logs/frontend/app-error.log",
            out_file: "/var/www/sanjoyc.com/logs/frontend/app-out.log",
            log_file: "/var/www/sanjoyc.com/logs/frontend/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "SanjoyC-CMS",
            script: "node_modules/@strapi/strapi/bin/strapi.js",
            args: "start",
            cwd: "/var/www/sanjoyc.com/backend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: "3012",
            },

            error_file: "/var/www/sanjoyc.com/logs/backend/cms-error.log",
            out_file: "/var/www/sanjoyc.com/logs/backend/cms-out.log",
            log_file: "/var/www/sanjoyc.com/logs/backend/cms-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "1536M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=1024",
        },

        {
            name: "DoubtAce",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3015 -H 127.0.0.1",
            cwd: "/var/www/doubtace.com/web",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
            },

            error_file: "/var/www/doubtace.com/logs/web/app-error.log",
            out_file: "/var/www/doubtace.com/logs/web/app-out.log",
            log_file: "/var/www/doubtace.com/logs/web/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "DoubtAce-Admin",
            script: "dist/server.js",
            cwd: "/var/www/doubtace.com/admin",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3016,
            },

            error_file: "/var/www/doubtace.com/logs/admin/api-error.log",
            out_file: "/var/www/doubtace.com/logs/admin/api-out.log",
            log_file: "/var/www/doubtace.com/logs/admin/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "DoubtAce-Student",
            script: "dist/server.js",
            cwd: "/var/www/doubtace.com/student",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3017,
            },

            error_file: "/var/www/doubtace.com/logs/student/api-error.log",
            out_file: "/var/www/doubtace.com/logs/student/api-out.log",
            log_file: "/var/www/doubtace.com/logs/student/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "DocuNova",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3020 -H 127.0.0.1",
            cwd: "/var/www/docunova.app/frontend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
            },

            error_file: "/var/www/docunova.app/logs/frontend/app-error.log",
            out_file: "/var/www/docunova.app/logs/frontend/app-out.log",
            log_file: "/var/www/docunova.app/logs/frontend/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "DocuNova-API",
            script: "dist/server.js",
            cwd: "/var/www/docunova.app/backend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3021,
            },

            error_file: "/var/www/docunova.app/logs/backend/api-error.log",
            out_file: "/var/www/docunova.app/logs/backend/api-out.log",
            log_file: "/var/www/docunova.app/logs/backend/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "GloziiaWeb",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 4000 -H 127.0.0.1",
            cwd: "/var/www/gloziia.com/web",

            instances: 1,
            exec_mode: "fork",

            env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 4000 },

            error_file: "/var/www/gloziia.com/logs/web/app-error.log",
            out_file: "/var/www/gloziia.com/logs/web/app-out.log",
            log_file: "/var/www/gloziia.com/logs/web/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "GloziiaPartner",
            script: "index.js",
            cwd: "/var/www/gloziia.com/partner",

            instances: 1,
            exec_mode: "fork",

            env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 4001 },

            error_file: "/var/www/gloziia.com/logs/partner/api-error.log",
            out_file: "/var/www/gloziia.com/logs/partner/api-out.log",
            log_file: "/var/www/gloziia.com/logs/partner/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "GloziiaCustomer",
            script: "index.js",
            cwd: "/var/www/gloziia.com/customer",

            instances: 1,
            exec_mode: "fork",

            env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 4002 },

            error_file: "/var/www/gloziia.com/logs/customer/api-error.log",
            out_file: "/var/www/gloziia.com/logs/customer/api-out.log",
            log_file: "/var/www/gloziia.com/logs/customer/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "GloziiaAdmin",
            script: "src/server.js",
            cwd: "/var/www/gloziia.com/admin",

            instances: 1,
            exec_mode: "fork",

            env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 4003 },

            error_file: "/var/www/gloziia.com/logs/admin/api-error.log",
            out_file: "/var/www/gloziia.com/logs/admin/api-out.log",
            log_file: "/var/www/gloziia.com/logs/admin/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "WBSSTCTech",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3510 -H 127.0.0.1",
            cwd: "/var/www/wbsstc.tech/frontend",

            instances: 1,
            exec_mode: "fork",

            env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 3510 },

            error_file: "/var/www/wbsstc.tech/logs/frontend/app-error.log",
            out_file: "/var/www/wbsstc.tech/logs/frontend/app-out.log",
            log_file: "/var/www/wbsstc.tech/logs/frontend/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "WBSSTCTech-CMS",
            script: "node_modules/@strapi/strapi/bin/strapi.js",
            args: "start",
            cwd: "/var/www/wbsstc.tech/backend",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: "3511",
            },

            error_file: "/var/www/wbsstc.tech/logs/backend/cms-error.log",
            out_file: "/var/www/wbsstc.tech/logs/backend/cms-out.log",
            log_file: "/var/www/wbsstc.tech/logs/backend/cms-combined.log",

            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,

            max_memory_restart: "1536M",
            restart_delay: 5000,
            max_restarts: 10,

            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=1024",
        },

        {
            name: "SFIC-Web",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3514 -H 127.0.0.1",
            cwd: "/var/www/sfic.aranax.dev/sfic/apps/web",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3514,
            },

            error_file: "/var/www/sfic.aranax.dev/logs/web/app-error.log",
            out_file: "/var/www/sfic.aranax.dev/logs/web/app-out.log",
            log_file: "/var/www/sfic.aranax.dev/logs/web/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "SFIC-API",
            script: "dist/server.js",
            cwd: "/var/www/sfic.aranax.dev/sfic/apps/api",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3515,
            },

            error_file: "/var/www/sfic.aranax.dev/logs/api/api-error.log",
            out_file: "/var/www/sfic.aranax.dev/logs/api/api-out.log",
            log_file: "/var/www/sfic.aranax.dev/logs/api/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "SFICEast-Web",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3520 -H 127.0.0.1",
            cwd: "/var/www/sficeast.in/code/apps/web",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3520,
            },

            error_file: "/var/www/sficeast.in/logs/web/app-error.log",
            out_file: "/var/www/sficeast.in/logs/web/app-out.log",
            log_file: "/var/www/sficeast.in/logs/web/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "2G",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "SFICEast-API",
            script: "dist/server.js",
            cwd: "/var/www/sficeast.in/code/apps/api",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3521,
            },

            error_file: "/var/www/sficeast.in/logs/api/api-error.log",
            out_file: "/var/www/sficeast.in/logs/api/api-out.log",
            log_file: "/var/www/sficeast.in/logs/api/api-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "2G",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },

        {
            name: "PM2Dashboard",
            script: "server/index.js",
            cwd: "/var/www/aranax.dev",

            instances: 1,
            exec_mode: "fork",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 9999,
            },

            error_file: "/var/www/aranax.dev/logs/dashboard/app-error.log",
            out_file: "/var/www/aranax.dev/logs/dashboard/app-out.log",
            log_file: "/var/www/aranax.dev/logs/dashboard/app-combined.log",
            merge_logs: true,
            time: true,

            watch: false,
            autorestart: true,
            max_memory_restart: "512M",
            restart_delay: 5000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,

            node_args: "--max-old-space-size=512",
        },
    ],
};
