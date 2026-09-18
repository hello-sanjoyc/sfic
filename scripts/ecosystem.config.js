module.exports = {
    apps: [
        {
            name: "SFIC-Web",
            cwd: "/usr/share/nginx/html/sficeast/apps/web",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3000 -H 127.0.0.1",

            instances: 2,
            exec_mode: "cluster",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 3000,
            },

            error_file: "/usr/share/nginx/html/sficeast/logs/web/app-error.log",
            out_file: "/usr/share/nginx/html/sficeast/logs/web/app-out.log",

            merge_logs: true,
            time: true,
            watch: false,
            autorestart: true,

            max_memory_restart: "2G",
            node_args: "--max-old-space-size=1536",

            restart_delay: 3000,
            max_restarts: 10,
            kill_timeout: 10000,
            listen_timeout: 15000,
        },

        {
            name: "SFIC-API",
            cwd: "/usr/share/nginx/html/sficeast/apps/api",
            script: "dist/server.js",

            instances: 4,
            exec_mode: "cluster",

            env: {
                NODE_ENV: "production",
                HOST: "127.0.0.1",
                PORT: 4000,
            },

            error_file: "/usr/share/nginx/html/sficeast/logs/api/api-error.log",
            out_file: "/usr/share/nginx/html/sficeast/logs/api/api-out.log",

            merge_logs: true,
            time: true,
            watch: false,
            autorestart: true,

            max_memory_restart: "2G",
            node_args: "--max-old-space-size=1536",

            restart_delay: 3000,
            max_restarts: 10,
            kill_timeout: 15000,
            listen_timeout: 15000,
        },
    ],
};
