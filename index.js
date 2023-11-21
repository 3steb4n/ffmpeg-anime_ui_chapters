const fs = require('fs');
const csv = require('csv-parser');
const exec = require('child_process').exec;
const util = require('util');
const properties = require('properties-reader');

const asyncExec = util.promisify(exec);
const filePath = 'test.csv';
const propertiesPath = 'variables.properties';
const rutaFFmpeg = properties(propertiesPath).get('PATH_FFMPEG');
const calidades = ['854x480', '1280x720', '1920x1080'];
const baseDir = properties(propertiesPath).get('PATH_CHAPTERS');

async function main() {
    const rows = [];

    // Leer el archivo CSV y almacenar las filas en un array
    await new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', () => {
                resolve();
            });
    });

    // Procesar las filas secuencialmente
    for (const row of rows) {
        await processRow(row);
    }

    console.log('Fin del archivo CSV');
}

async function processRow(row) {
    let calidadesCarpeta = '';

    const createAnimeFolders = async () => {
        process.chdir(`${baseDir}`);
    
        if (fs.existsSync(`${row.title}`)) {
            process.chdir(`${baseDir}/${row.title}`);
            fs.mkdirSync(`${row.number}`);
            process.chdir(`${baseDir}/${row.title}/${row.number}`);
        
            calidadesCarpeta = `${baseDir}/${row.title}/${row.number}`;
        } else {
            fs.mkdirSync(`${row.title}`);
            process.chdir(`${baseDir}/${row.title}`);
        
            fs.mkdirSync(`${row.number}`);
            process.chdir(`${baseDir}/${row.title}/${row.number}`);
        
            calidadesCarpeta = `${baseDir}/${row.title}/${row.number}`;
        }
    
    
        console.log(`Carpeta creada: ${baseDir}`);
    
        for (const value of calidades) {
            fs.mkdirSync(`${value}`);
        }

        console.log(`Cambió al directorio: ${baseDir}`);
    }


    const calidadesIndex = async () => {
        for (const value of calidades) {
            process.chdir(calidadesCarpeta);
    
            let match = value.match(/(\d+)\s?[xX]\s?(\d+)/);
            const comando = `"${rutaFFmpeg}" -i ${('https://animeui.infura-ipfs.io/ipfs/' + row.cid)} -sn -s ${value} -c:v libx264 -crf 20 -preset fast -c:a aac -b:a 128k -ac 2 -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${match[0]}p_%03d.ts" ${match[0]}p.m3u8`;
    
            process.chdir(value);
    
            try {
                const { stdout, stderr } = await asyncExec(comando);
                console.log('Salida del comando:');
                console.log(stdout);
                console.log(stderr);
    
            } catch (error) {
                console.error(`Error al ejecutar el comando: ${error.message}`);
            }
        }
    }

    const createMasterFile = async () => {
        let createMaster = fs.createWriteStream(calidadesCarpeta + '/' + 'master.m3u8');
    
        createMaster.write(`#EXTM3U 
#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=1920x1080
/1920x1080/1920x1080.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1280x720
/1280x720/1280x720.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=854x480
/854x480/854x480.m3u8`);

        createMaster.end();

        createMaster.on('finish', () => {
            console.log('Archivo master m3u08 creado satisfactoriamente');
        })

        createMaster.on('error', err => {
            console.error(`Errro al crear el archivo master ${err}`);
        })
    
        console.log(`CID: ${row.cid}, Number: ${row.number}, Title: ${row.title}`);
    }

    await createAnimeFolders();
    await calidadesIndex();
    await createMasterFile();
}

//Función principal
main();