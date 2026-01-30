#!/usr/bin/env node

/**
 * Script de vérification du déploiement Vercel
 * Vérifie que toutes les configurations sont correctes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration de déploiement Vercel\n');

let hasErrors = false;
let hasWarnings = false;

// Couleurs pour le terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function success(msg) {
    console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
    console.log(`${colors.red}❌ ${msg}${colors.reset}`);
    hasErrors = true;
}

function warning(msg) {
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
    hasWarnings = true;
}

function info(msg) {
    console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

// 1. Vérifier package.json
console.log('📦 Vérification de package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    if (packageJson.scripts.build) {
        success('Script "build" trouvé');
    } else {
        error('Script "build" manquant dans package.json');
    }

    if (packageJson.scripts.start) {
        success('Script "start" trouvé');
    } else {
        error('Script "start" manquant dans package.json');
    }

    // Vérifier les dépendances essentielles
    const requiredDeps = ['next', 'react', 'react-dom', '@supabase/supabase-js', '@supabase/ssr'];
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
            success(`Dépendance "${dep}" installée`);
        } else {
            error(`Dépendance "${dep}" manquante`);
        }
    });
} catch (err) {
    error(`Impossible de lire package.json: ${err.message}`);
}

console.log('');

// 2. Vérifier next.config.ts
console.log('⚙️  Vérification de next.config.ts...');
if (fs.existsSync('next.config.ts')) {
    success('next.config.ts trouvé');
} else if (fs.existsSync('next.config.js')) {
    success('next.config.js trouvé');
} else {
    warning('Aucun fichier next.config trouvé (optionnel)');
}

console.log('');

// 3. Vérifier middleware.ts
console.log('🛡️  Vérification du middleware...');
if (fs.existsSync('middleware.ts')) {
    success('middleware.ts trouvé');
    const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
    if (middlewareContent.includes('updateSession')) {
        success('Fonction updateSession détectée');
    } else {
        warning('Fonction updateSession non trouvée dans middleware.ts');
    }
} else {
    warning('middleware.ts non trouvé (optionnel mais recommandé pour l\'auth)');
}

console.log('');

// 4. Vérifier .env.local
console.log('🔐 Vérification des variables d\'environnement locales...');
if (fs.existsSync('.env.local')) {
    success('.env.local trouvé');
    const envContent = fs.readFileSync('.env.local', 'utf8');

    const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'PERPLEXITY_API_KEY'
    ];

    requiredEnvVars.forEach(envVar => {
        if (envContent.includes(envVar)) {
            success(`Variable ${envVar} trouvée`);
        } else {
            error(`Variable ${envVar} manquante dans .env.local`);
        }
    });

    // Vérifier ADMIN_EMAIL (optionnel mais recommandé)
    if (envContent.includes('ADMIN_EMAIL')) {
        success('Variable ADMIN_EMAIL trouvée');
    } else {
        warning('Variable ADMIN_EMAIL manquante (recommandée)');
    }
} else {
    error('.env.local non trouvé');
}

console.log('');

// 5. Vérifier .gitignore
console.log('📝 Vérification de .gitignore...');
if (fs.existsSync('.gitignore')) {
    success('.gitignore trouvé');
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');

    if (gitignoreContent.includes('.env.local') || gitignoreContent.includes('.env*')) {
        success('.env.local est dans .gitignore (sécurité)');
    } else {
        error('.env.local devrait être dans .gitignore !');
    }


    if (gitignoreContent.includes('node_modules')) {
        success('node_modules est dans .gitignore');
    } else {
        warning('node_modules devrait être dans .gitignore');
    }
} else {
    warning('.gitignore non trouvé');
}

console.log('');

// 6. Vérifier la structure des dossiers
console.log('📁 Vérification de la structure du projet...');
const requiredDirs = ['app', 'lib', 'public'];
requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        success(`Dossier "${dir}" trouvé`);
    } else {
        warning(`Dossier "${dir}" non trouvé`);
    }
});

console.log('');

// 7. Vérifier les fichiers essentiels
console.log('📄 Vérification des fichiers essentiels...');
const essentialFiles = [
    'app/page.tsx',
    'app/layout.tsx',
    'lib/supabaseBrowser.ts',
    'lib/supabaseServer.ts'
];


essentialFiles.forEach(file => {
    if (fs.existsSync(file)) {
        success(`Fichier "${file}" trouvé`);
    } else {
        warning(`Fichier "${file}" non trouvé`);
    }
});

console.log('');

// 8. Vérifier tsconfig.json
console.log('🔧 Vérification de tsconfig.json...');
if (fs.existsSync('tsconfig.json')) {
    success('tsconfig.json trouvé');
    try {
        const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
        if (tsconfig.compilerOptions) {
            success('compilerOptions configuré');
        }
    } catch (err) {
        error(`Erreur dans tsconfig.json: ${err.message}`);
    }
} else {
    error('tsconfig.json manquant (requis pour TypeScript)');
}

console.log('');

// Résumé final
console.log('═══════════════════════════════════════════════════════');
if (hasErrors) {
    console.log(`${colors.red}❌ ERREURS DÉTECTÉES - Le déploiement pourrait échouer${colors.reset}`);
    console.log('Corrigez les erreurs ci-dessus avant de déployer.');
} else if (hasWarnings) {
    console.log(`${colors.yellow}⚠️  AVERTISSEMENTS DÉTECTÉS - Le déploiement devrait fonctionner${colors.reset}`);
    console.log('Vérifiez les avertissements pour optimiser votre configuration.');
} else {
    console.log(`${colors.green}✅ TOUT EST OK - Prêt pour le déploiement !${colors.reset}`);
}
console.log('═══════════════════════════════════════════════════════');

console.log('\n📚 Prochaines étapes:');
console.log('1. Committez vos changements: git add . && git commit -m "Ready for deployment"');
console.log('2. Poussez sur GitHub: git push origin main');
console.log('3. Vérifiez les variables d\'environnement dans Vercel Dashboard');
console.log('4. Déployez ou attendez le déploiement automatique');
console.log('\n📖 Pour plus d\'aide, consultez DEBUG_VERCEL_DEPLOYMENT.md\n');

process.exit(hasErrors ? 1 : 0);
