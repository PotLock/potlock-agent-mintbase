import { searchProject } from "@/utils/search-project";
import { swagger } from '@elysiajs/swagger';
import { providers } from 'near-api-js'
import { Elysia } from "elysia";
import fs from 'fs'
import path from 'path';

// @ts-ignore
import Big from 'big.js';


const app = new Elysia({ prefix: '/api', aot: false })
    .use(swagger())
    .get("/:accountId", async ({ params: { accountId } }) => {
        const project = await searchProject(accountId)
        return project;
    })
    .get("/donate/:accountId/:quantity", async ({ params: { accountId, quantity }, headers }) => {
        const project: any = await searchProject(accountId)
        if (project.length === 0) {
            return "project not found"
        }

        return [{
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
        }];
    })
    .get("/snapshot", async () => {
        const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
        const accountList: any = await provider.query({
            request_type: "call_function",
            account_id: "registry.potlock.near",
            method_name: "get_projects",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const projectObject = (JSON.parse(Buffer.from(accountList.result).toString()));
        const data = await Object.values(projectObject).map(async (project: any, index: number) => {
            if (project.status === "Approved") {

                const projectDetail: any = await provider.query({
                    request_type: "call_function",
                    account_id: "social.near",
                    method_name: "get",
                    args_base64: (Buffer.from(JSON.stringify({ "keys": [`${project.id}/profile/**`] }))).toString("base64"),
                    finality: "optimistic",
                })
                const dataProjectJson = (JSON.parse(Buffer.from(projectDetail.result).toString()));
                const data = Object.keys(dataProjectJson).map((key) => {
                    const data = Object.values(dataProjectJson).map((item: any) => {
                        const data = {
                            index: index,
                            accountId: project.id == key && key,
                            category: item.profile.category?.text ? [item.profile.category.text] : item.profile.category ? [item.profile.category] : JSON.parse(item.profile.plCategories),
                            backgroundImage: item.profile?.backgroundImage ? `https://ipfs.near.social/ipfs/${item.profile.backgroundImage.ipfs_cid}` : '',
                            image: item.profile?.image ? `https://ipfs.near.social/ipfs/${item.profile.image.ipfs_cid}` : '',
                            name: item.profile?.name,
                            description: item.profile?.description,
                            tagline: item.profile?.tagline,
                            socialUrl: item.profile?.linktree,
                            website: item.profile?.website,
                            tags: Object.keys(item.profile?.tags || [])
                        }
                        return data;
                    })
                    return data[0];
                })
                return data[0];

            }
            // projectList.push(data)
        });
        const projects = await Promise.all(data);
        const projectsFilter = projects.filter(value => { return !!value }).reduce((result: any, item: any) => {
            const { accountId } = item;
            result[accountId] = item;
            return result;
        }, {});
        const dataWrite = ` export const whitelistedTokens = \n` + JSON.stringify(projectsFilter);
        const SnapshotFilename = path.join(process.cwd(), 'src/snapshot/projects.ts');
        fs.writeFileSync(SnapshotFilename, dataWrite);
        //projectList.length > 1 && 
        return {
            result: projectsFilter,
        };
    })
    .compile()


export const GET = app.handle
export const POST = app.handle