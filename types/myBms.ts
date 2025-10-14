export interface myBmActions {
    brandmasterId: number,
    brandmasterLogin: string,
    brandmasterName: string,
    brandmasterLastName: string,
    territoryIdent: string,
    supervisorId: number,
    actions: ActionBM[]
};

export interface ActionBM {
    shopId: number,
    shopName: string,
    shopAddress: string,
    eventName: string,

    actionId: number,
    since: string,
    until: string,

    createdAt: string,
    status: string
};

export interface myBms{
    brandmasterId: number,
    brandmasterLogin: string,
    brandmasterName: string,
    brandmasterLast: string,
    tourplannerId: string | null
}

export interface myBmsTargets extends myBms {
    idTarget: number | null ,
    targetHilo: number | null ,
    targetHiloPlus: number | null ,
    targetVelo: number | null ,
}