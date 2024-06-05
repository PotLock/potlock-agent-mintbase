import { searchProject } from "@/utils/search-project";
import { searchPot } from "@/utils/search-pots";
import { swagger } from '@elysiajs/swagger';
import { providers } from 'near-api-js'
import { Elysia } from "elysia";
import fs from 'fs'

const app = new Elysia({ prefix: '/api', aot: false })
    .use(swagger())
    .get("/accountId/:accountId", async ({ params: { accountId } }) => {
        const project = await searchProject(accountId)
        return project;
    })
    .get("/pot/:potId", async ({ params: { potId } }) => {
        const pot = await searchPot(potId)
        return pot;
    })
    .get("/donate/:accountId/:quantity", async ({ params: { accountId, quantity }, headers }) => {
        const projects: any = await searchProject(accountId)
        if (projects.length === 0) {
            return "project not found"
        }
        const dataFunc = projects.map((project: any) => {
            return {
                receiverId: "donate.potlock.near",
                functionCalls: [
                    {
                        methodName: "ft_transfer_call",
                        args: {
                            receiver_id: project.accountId,
                        },
                        gas: "300000000000000",
                        amount: quantity
                    }
                ]
            };
        })
        return dataFunc;
    })
    .get("/donate/pot/:potId/:accountId/:quantity", async ({ params: { potId, accountId, quantity }, headers }) => {
        if (parseFloat(quantity) < 0.1) {
            return "amount donate have to > 0.1"
        }
        const pots: any = await searchPot(potId)
        if (pots.length === 0) {
            return "pot not found"
        }
        const potsIsNotRoundLive = pots.filter((project: any) => !project.isRoundLive);
        //check Pot live
        if (potsIsNotRoundLive.length > 0) {
            const potsIsNotRoundLiveArray = potsIsNotRoundLive.map((POT: any) => POT.name)
            return `Pot ${potsIsNotRoundLiveArray.join(", ")} not live`
        }
        // check project exist in pot
        const projects: any = await searchProject(accountId)
        const projectData = projects.map((project: any) => project.accountId)
        const foundData: any = [];
        pots.forEach((item: any) => {
            const commonProjects = item.project.filter((project: any) => projectData.includes(project));
            if (commonProjects.length > 0) {
                foundData.push({
                    id: item.id,
                    project: commonProjects
                });
            }
        });
        const transformedArray: any = [];

        foundData.forEach((item: any) => {
            item.project.forEach((project: any) => {
                transformedArray.push({
                    id: item.id,
                    project
                });
            });
        });
        // convert data to method near call function
        const dataFunc = transformedArray.map((pot: any) => {
            return {
                receiverId: pot.id,
                functionCalls: [
                    {
                        methodName: "ft_transfer_call",
                        args: {
                            project_id: pot.project,
                        },
                        gas: "300000000000000",
                        amount: quantity
                    }
                ]
            };
        })
        return dataFunc;
    })
    // .get("/snapshot", async () => {
    //     const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
    //     const accountList: any = await provider.query({
    //         request_type: "call_function",
    //         account_id: "registry.potlock.near",
    //         method_name: "get_projects",
    //         args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
    //         finality: "optimistic",
    //     })
    //     const projectObject = (JSON.parse(Buffer.from(accountList.result).toString()));
    //     const data = await Object.values(projectObject).map(async (project: any, index: number) => {
    //         if (project.status === "Approved") {
    //             const projectDetail: any = await provider.query({
    //                 request_type: "call_function",
    //                 account_id: "social.near",
    //                 method_name: "get",
    //                 args_base64: (Buffer.from(JSON.stringify({ "keys": [`${project.id}/profile/**`] }))).toString("base64"),
    //                 finality: "optimistic",
    //             })
    //             const dataProjectJson = (JSON.parse(Buffer.from(projectDetail.result).toString()));
    //             const data = Object.keys(dataProjectJson).map((key) => {
    //                 const data = Object.values(dataProjectJson).map((item: any) => {
    //                     const data = {
    //                         index: index,
    //                         accountId: project.id == key && key,
    //                         category: item.profile.category?.text ? [item.profile.category.text] : item.profile.category ? [item.profile.category] : JSON.parse(item.profile.plCategories),
    //                         backgroundImage: item.profile?.backgroundImage ? `https://ipfs.near.social/ipfs/${item.profile.backgroundImage.ipfs_cid}` : '',
    //                         image: item.profile?.image ? `https://ipfs.near.social/ipfs/${item.profile.image.ipfs_cid}` : '',
    //                         name: item.profile?.name,
    //                         description: item.profile?.description,
    //                         tagline: item.profile?.tagline,
    //                         socialUrl: item.profile?.linktree,
    //                         website: item.profile?.website,
    //                         tags: Object.keys(item.profile?.tags || [])
    //                     }
    //                     return data;
    //                 })
    //                 return data[0];
    //             })
    //             return data[0];
    //         }
    //         // projectList.push(data)
    //     });
    //     const projects = await Promise.all(data);
    //     const projectsFilter = projects.filter(value => { return !!value }).reduce((result: any, item: any) => {
    //         const { accountId } = item;
    //         result[accountId] = item;
    //         return result;
    //     }, {});
    //     const dataWrite = ` export const whitelistedProjects = \n` + JSON.stringify(projectsFilter, null, 2);
    //     const SnapshotFilename = 'src/snapshot/projects.ts';
    //     fs.writeFileSync(SnapshotFilename, dataWrite);



    //     ////////////////////////////////////////// Pots

    //     const pottList: any = await provider.query({
    //         request_type: "call_function",
    //         account_id: "v1.potfactory.potlock.near",
    //         method_name: "get_pots",
    //         args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
    //         finality: "optimistic",
    //     })
    //     const potObject = (JSON.parse(Buffer.from(pottList.result).toString()));
    //     const dataPot = await Object.values(potObject).map(async (pot: any, index: number) => {
    //         const potInfo: any = await provider.query({
    //             request_type: "call_function",
    //             account_id: pot.id,
    //             method_name: "get_config",
    //             args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
    //             finality: "optimistic",
    //         })
    //         const potInfoData = JSON.parse(Buffer.from(potInfo.result).toString())
    //         const projectList: any = await provider.query({
    //             request_type: "call_function",
    //             account_id: pot.id,
    //             method_name: "get_approved_applications",
    //             args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
    //             finality: "optimistic",
    //         })
    //         const isRoundLive: any = await provider.query({
    //             request_type: "call_function",
    //             account_id: pot.id,
    //             method_name: "is_round_active",
    //             args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
    //             finality: "optimistic",
    //         })
    //         const dataProjectJson = (JSON.parse(Buffer.from(projectList.result).toString()));

    //         const data = {
    //             id: pot.id,
    //             name: potInfoData.pot_name,
    //             description: potInfoData.pot_description,
    //             project: dataProjectJson.map((item: any) => item.project_id),
    //             isRoundLive: JSON.parse(Buffer.from(isRoundLive.result).toString())
    //         }
    //         console.log(data)
    //         return data;

    //     });
    //     const pots = await Promise.all(dataPot);
    //     const potsFilter = pots.filter(value => { return !!value }).reduce((result: any, item: any) => {
    //         const { id } = item;
    //         result[id] = item;
    //         return result;
    //     }, {});

    //     const dataWritePots = ` export const whitelistedPots = \n` + JSON.stringify(potsFilter, null, 2);
    //     const SnapshotFilenamePots = 'src/snapshot/pots.ts';
    //     fs.writeFileSync(SnapshotFilenamePots, dataWritePots);


    //     return {
    //         projects: projectsFilter,
    //         pots: potsFilter
    //     };
    // })
    .compile()


export const GET = app.handle
export const POST = app.handle