/**************************************************
 * Bot notificare prezenta Mattermost prin consultarea inregistrarilor 
 * din tabela de prezenta create prin aplicatia HR SelfService Online
 * 
 * Cheia de legatura este user_id care se salveaza in tabela personal din Nexus in campul id_extern
 * 
 * Utilizatorul care este folosit pentru interogari trebuie sa aiba drept in
 * tabela personal si bifa de acces extern.
 * 
 * */

const sql = require('mssql');
const env = require('dotenv').config();
const config = require('./config').config;
const axios = require('axios');

const sterg_avertizari_vechi = 1; //1 pentru activare;
const zile_stergere_avertizari_vechi = 30;
const tickRate = 1; //minute
const bot_username = process.env.USER_NAME;

//console.log("Script initializat si timer activat!");

tick(); // rulam o data functia la pornirea aplicatiei;

function tick() {

    var raspuns_bot = '';

    sql.connect(config, err => {

        const request = new sql.Request()
        request.stream = true
        request.query(`use xecutive; select distinct titlu,text,format(data_cr, 'dd.MM.yyyy hh:mm') as [data_cr] from avertizari 
                        WHERE (datediff(mi,convert(datetime,[data_cr]),GETDATE()) < ${tickRate} 
                        AND utilizator='${bot_username}'
                        AND format(data_cr, 'dd.MM.yyyy')=format(getdate(), 'dd.MM.yyyy') 
                        AND datediff(hh,convert(datetime,[data_cr]),GETDATE()) = 0)`)

        request.on('recordset', columns => {
        })

        request.on('row', row => {
            raspuns_bot += `\n${row['titlu']}\n${row['text']}`
        })

        request.on('rowsaffected', rowCount => {

        })

        request.on('error', err => {
            console.log('Eroare\n' + err);
        })

        request.on('done', result => {
            if (raspuns_bot != '') {
                post_to_mattermost(raspuns_bot);
            }
            if (sterg_avertizari_vechi == 1) {

                //stergem avertizarile mai vechi de un numar de zile parametrizat.
                raspuns_bot = '';
                const del_request = new sql.Request()
                del_request.stream = true
                del_request.query(`use xecutive; DELETE avertizari 
                                        WHERE utilizator='${bot_username}'
                                        AND [data_cr] < dateadd(day,-${zile_stergere_avertizari_vechi},getdate())`)

                del_request.on('recordset', columns => {
                })

                del_request.on('row', row => {
                })

                del_request.on('rowsaffected', rowCount => {
                    if (rowCount > 0) {
                        raspuns_bot += `Am sters ${rowCount} avertizari mai vechi de ${zile_stergere_avertizari_vechi} zile.`
                    }
                })

                del_request.on('error', err => {
                    console.log('Eroare\n' + err);
                })

                del_request.on('done', result => {
                    if (raspuns_bot != '') {
                        post_to_mattermost(raspuns_bot);
                        raspuns_bot = '';
                    }
                    sql.close();
                })
            } else {
                sql.close();
            }
        })
    })

    sql.on('error', err => {
        console.log(err);
    })

    function post_to_mattermost(text) {
        var post_data = {
            "channel_id": process.env.CHANNEL_ID,
            "message": text
        }
        var axios_config = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.BOT_TOKEN
            }
        }

        axios
            .post(`${process.env.POST_URL}`, post_data, axios_config)
            .then(res => {
                //console.log(`statusCode: ${res.status}`)
                //console.log(res)
            })
            .catch(error => {
                console.error(error)
            })
    };

}

setInterval(tick, tickRate * 60000);