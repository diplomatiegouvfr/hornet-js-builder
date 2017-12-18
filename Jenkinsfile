pipeline {
    agent {
        label "hornet-js"
    }

    environment {
        // Projet
        MODULE_GROUP="hornet-js"
        MODULE_ID="hornet-js-builder"

        BUILD_TIMESTAMP=sh(script: 'date +%Y%m%d%H%M%S', returnStdout:true).trim()
        VERSION_PACKAGE=sh(script:"npm run version --silent", returnStdout:true).trim()

        VERSION_RELEASE="${VERSION_PACKAGE}"
        VERSION_SNAPSHOT="${VERSION_RELEASE}-${BUILD_TIMESTAMP}"

        // Publication
        ARTIFACTORY_URL = ""
        REPOSITORY_GROUP="hornet"
        REPOSITORY_SNAPSHOT = "${REPOSITORY_GROUP}-snapshot"
        REPOSITORY_RELEASE = "${REPOSITORY_GROUP}-release"
        REPOSITORY_NPM_SNAPSHOT = "${REPOSITORY_GROUP}-npm-snapshot"
        REPOSITORY_NPM_RELEASE = "${REPOSITORY_GROUP}-npm-release"

        // Qualité
        SONAR_HOST = ""
        SONAR_AUTH_TOKEN = ""
        SONAR_SCANNER_CLI = "3.0.3.778"
    }

    options {
        buildDiscarder(logRotator(artifactDaysToKeepStr: "20", artifactNumToKeepStr: "1", daysToKeepStr: "90", numToKeepStr: "20"))
        disableConcurrentBuilds()
    }

    stages {
        stage("Environnement") {
            steps {
                echo sh(script: "env|sort", returnStdout: true)
            }
            post {
                success {
                    echo "[SUCCESS] Success to print Environnement"
                }
                failure {
                    echo "[FAILURE] Failed to print Environnement"
                }
            }
        }

        stage("Build") {
            steps {
                withNPM(npmrcConfig: "npmrc_hornet") {
                    sh '''
                        npm install -f
                        zip -qr ${MODULE_ID}.zip package.json ./src ./node_modules ./bin *.md .npmignore Jenkinsfile
                    '''
                }
            }
            post {
                success {
                    echo "[SUCCESS] Success to build"
                    archive "*.zip"
                }
                failure {
                    echo "[FAILURE] Failed to build"
                }
            }
        }

        stage("Publish snapshot") {
            when {
                branch "develop"
            }
            steps {
                sh "mv ${MODULE_ID}.zip ${MODULE_ID}-${VERSION_SNAPSHOT}.zip"
                withCredentials([usernamePassword(credentialsId: "hornet_ci_at_artifactory", passwordVariable: "pwd_ci", usernameVariable: "user_ci")]) {
                    script {
                        def artifactory = Artifactory.newServer url: "${ARTIFACTORY_URL}", username: "${user_ci}", password: "${pwd_ci}"
                        def uploadSpec = """{
                            "files": [
                            {
                                "pattern": "*.zip",
                                "target": "${REPOSITORY_SNAPSHOT}/${MODULE_GROUP}/${MODULE_ID}/${VERSION_SNAPSHOT}/"

                            }
                        ]
                        }"""
                        artifactory.upload(uploadSpec)

                    }
                }
                archiveArtifacts artifacts: "*.zip", fingerprint: true
            }
            post {
                success {
                    echo "[SUCCESS] Success to Publish snapshot"
                }
                failure {
                    echo "[FAILURE] Failed to Publish snapshot"
                }
            }
        }

        stage("Publish NPM snapshot") {
            when {
                branch "develop"
            }
            steps {
                withNPM(npmrcConfig: "npmrc_hornet") {
                    sh '''
                        npm version ${VERSION_SNAPSHOT} -f
                        npm publish --registry ${ARTIFACTORY_URL}/api/npm/${REPOSITORY_NPM_SNAPSHOT}
                    '''
                }
            }
            post {
                success {
                    echo "[SUCCESS] Success to Publish snapshot"
                }
                failure {
                    echo "[FAILURE] Failed to Publish snapshot"
                }
            }
        }


        stage("Publish release") {
            when {
                branch "master"
            }
            steps {
                sh "mv ${MODULE_ID}.zip ${MODULE_ID}-${VERSION_RELEASE}.zip"
                withCredentials([usernamePassword(credentialsId: "hornet_ci_at_artifactory", passwordVariable: "pwd_ci", usernameVariable: "user_ci")]) {
                    script {
                        def artifactory = Artifactory.newServer url: "${ARTIFACTORY_URL}", username: "${user_ci}", password: "${pwd_ci}"
                        def uploadSpec = """{
                            "files": [
                            {
                                "pattern": "*.zip",
                                "target": "${REPOSITORY_RELEASE}/${MODULE_GROUP}/${MODULE_ID}/${VERSION_RELEASE}/"

                            }
                        ]
                        }"""
                        artifactory.upload(uploadSpec)

                    }
                }
                archiveArtifacts artifacts: "*.zip", fingerprint: true
            }
            post {
                success {
                    echo "[SUCCESS] Success to Publish release"
                }
                failure {
                    echo "[FAILURE] Failed to Publish release"
                }
            }
        }

        stage("Publish NPM release") {
            when {
                branch "master"
            }
            steps {
                withNPM(npmrcConfig: "npmrc_hornet") {
                    sh '''
                        npm publish --registry ${ARTIFACTORY_URL}/api/npm/${REPOSITORY_NPM_RELEASE}
                    '''
                }
            }
            post {
                success {
                    echo "[SUCCESS] Success to Publish release"
                }
                failure {
                    echo "[FAILURE] Failed to Publish release"
                }
            }
        }

        stage("Quality") {
            when {
                anyOf {
                    branch "develop"
                    branch "master"
                }
            }
            steps {
                script {
                  scannerHome = tool "SonarQube Scanner ${SONAR_SCANNER_CLI}"
                }

                sh '''
                    echo "
                    sonar.host.url=${SONAR_HOST}
                    sonar.login=${SONAR_AUTH_TOKEN}
                    sonar.projectKey=${MODULE_GROUP}:${MODULE_ID}
                    sonar.projectName=${MODULE_ID}
                    sonar.projectVersion=${VERSION_SNAPSHOT}
                    sonar.sourceEncoding=UTF-8
                    sonar.sources=./src
                    sonar.exclusions=**/node_modules/**,**/*.spec.ts
                    sonar.tests=./test
                    sonar.test.inclusions=**/*.spec.ts, **/*.test.karma.ts

                    sonar.cobertura.reportPath=**/istanbul/reports/cobertura-coverage.xml

                    sonar.language=js
                    " > sonar-project.properties
                '''
               sh "${scannerHome}/bin/sonar-scanner"
            }

            post {
                success {
                    echo "[SUCCESS] Success to run Quality"
                }
                failure {
                    echo "[FAILURE] Failed to run Quality"
                }
            }
        }
    }
}
