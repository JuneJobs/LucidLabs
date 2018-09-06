/*
valuable galbage
*/
const SERVER_RECV_MSG_BY_STATE = {
     TSI: {
        IDLE_STATE: [
            SSP_MSG_TYPE.SSP_SIR_REQ
        ],
        HALF_SSN_INFORMED_STATE: [
            SSP_MSG_TYPE.SSP_SIR_REQ,
            SDP_MSG_TYPE.SDP_SIR_RSP
        ],
        SSN_INFORMED_STATE: [
            SSP_MSG_TYPE.SSP_SIR_REQ
        ]
    },
    SSN: {
        IDLE_STATE: [
            SSP_MSG_TYPE.SSP_DCA_REQ
        ],
        SSN_INFORMED_STATE: [],
        HALF_CID_INFORMED_STATE: [
            SSP_MSG_TYPE.SSP_DCA_REQ,
            SDP_MSG_TYPE.SDP_DCA_RSP
        ],
        CID_INFORMED_STATE: [
            SSP_MSG_TYPE.SSP_DCD_NOT,
            SSP_MSG_TYPE.SSP_RAD_TRN,
            SDP_MSG_TYPE.SDP_RAD_ACK
        ],
        HALF_IDLE_STATE: [
            SSP_MSG_TYPE.SSP_DCD
        ]
    },
    TCI: {
        IDLE_STATE: [
            SAP_MSG_TYPE.SAP_SGU_REQ,
            SWP_MSG_TYPE.SWP_SGU_REQ,
            SAP_MSG_TYPE.SAP_SGI_REQ,
            SWP_MSG_TYPE.SWP_SGI_REQ,
            SAP_MSG_TYPE.SAP_FPU_REQ,
            SWP_MSG_TYPE.SWP_FPU_REQ
        ],
        USER_ID_DUPLICATE_REQUESTED_STATE: [
            SDP_MSG_TYPE.SDP_SGU_RSP,
            SAP_MSG_TYPE.SAP_SGU_REQ,
            SWP_MSG_TYPE.SWP_SGU_REQ
        ],
        USER_ID_AVAILABLITY_CONFIRMED_STATE: [
            SAP_MSG_TYPE.SAP_SGU_REQ,
            SWP_MSG_TYPE.SWP_SGU_REQ,
            SAP_MSG_TYPE.SAP_UVC_REQ,
            SWP_MSG_TYPE.SWP_UVC_REQ
        ],
        USER_HALF_USN_ALLOCATED_STATE: [
            SAP_MSG_TYPE.SAP_SGU_REQ,
            SWP_MSG_TYPE.SWP_SGU_REQ,
            SAP_MSG_TYPE.SAP_UVC_REQ,
            SWP_MSG_TYPE.SWP_UVC_REQ,
            SDP_MSG_TYPE.SDP_UVC_RSP
        ],
        USN_ALLOCATED_STATE: [
            SAP_MSG_TYPE.SAP_SGU_REQ,
            SWP_MSG_TYPE.SWP_SGU_REQ,
            SAP_MSG_TYPE.SAP_UVC_REQ,
            SWP_MSG_TYPE.SWP_UVC_REQ
        ],
        HALF_USN_INFORMED_STATE: [
            SAP_MSG_TYPE.SAP_SGI_REQ,
            SWP_MSG_TYPE.SWP_SGI_REQ,
            SDP_MSG_TYPE.SDP_SGI_RSP
        ],
        HALF_IDLE_STATE: [
            SDP_MSG_TYPE.SDP_SGU_REQ,
            SAP_MSG_TYPE.SAP_FPU_REQ,
            SWP_MSG_TYPE.SWP_FPU_REQ
        ]
    },
    USN: {
        IDLE_STATE: [
            SAP_MSG_TYPE.SAP_RAV_REQ,
            SWP_MSG_TYPE.SWP_RAV_REQ
        ],
        USN_INFORMED_STATE: [
            SAP_MSG_TYPE.SAP_DCA_REQ,
            SAP_MSG_TYPE.SAP_SGO_NOT,
            SWP_MSG_TYPE.SWP_SGO_NOT,
            SWP_MSG_TYPE.SWP_UDR_REQ,
            SAP_MSG_TYPE.SAP_UPC_REQ,
            SWP_MSG_TYPE.SWP_UPC_REQ,
            SWP_MSG_TYPE.SWP_AUV_REQ,
            SDP_MSG_TYPE.SDP_AUV_RSP,
            SWP_MSG_TYPE.SWP_ASR_REQ,
            SDP_MSG_TYPE.SDP_ASR_RSP,
            SWP_MSG_TYPE.SWP_ASD_REQ,
            SDP_MSG_TYPE.SDP_ASD_RSP,
            SWP_MSG_TYPE.SWP_ASV_REQ,
            SDP_MSG_TYPE.SDP_ASV_RSP,
            SAP_MSG_TYPE.SAP_SRG_REQ,
            SDP_MSG_TYPE.SDP_SRG_RSP,
            SAP_MSG_TYPE.SAP_SAS_REQ,
            SWP_MSG_TYPE.SAP_SAS_REQ,
            SDP_MSG_TYPE.SDP_SAS_RSP,
            SAP_MSG_TYPE.SAP_SDD_REQ,
            SWP_MSG_TYPE.SWP_SDD_REQ,
            SDP_MSG_TYPE.SDP_SDD_RSP,
            SAP_MSG_TYPE.SAP_SLV_REQ,
            SWP_MSG_TYPE.SWP_SLV_REQ,
            SDP_MSG_TYPE.SDP_SLV_RSP,
            SAP_MSG_TYPE.SAP_RAV_REQ,
            SWP_MSG_TYPE.SWP_RAV_REQ,
            SWP_MSG_TYPE.SWP_HAV_REQ,
            SDP_MSG_TYPE.SDP_HAV_RSP,
            SWP_MSG_TYPE.SWP_SHR_REQ,
            SDP_MSG_TYPE.SDP_SHR_RSP,
            SAP_MSG_TYPE.SAP_HHV_REQ,
            SWP_MSG_TYPE.SWP_HHV_REQ,
            SDP_MSG_TYPE.SDP_HHV_RSP,
            SAP_MSG_TYPE.SAP_KAS_REQ,
            SWP_MSG_TYPE.SWP_KAS_REQ
        ],
        HALF_CID_INFORMED_STATE: [
            SAP_MSG_TYPE.SAP_SGO_NOT,
            SWP_MSG_TYPE.SWP_SGO_NOT,
            SWP_MSG_TYPE.SWP_UDR_REQ,
            SDP_MSG_TYPE.SDP_DCA_RSP
        ],
        CID_INFORMED_STATE: [
            SAP_MSG_TYPE.SAP_DCA_REQ,
            SAP_MSG_TYPE.SAP_DCD_NOT,
            SAP_MSG_TYPE.SAP_RHD_TRN,
            SDP_MSG_TYPE.SDP_RHD_ACK,
            SAP_MSG_TYPE.SAP_UPC_REQ,
            SWP_MSG_TYPE.SWP_UPC_REQ,
            SDP_MSG_TYPE.SDP_UPC_RSP,
            SWP_MSG_TYPE.SWP_AUV_REQ,
            SDP_MSG_TYPE.SDP_AUV_RSP,
            SWP_MSG_TYPE.SWP_ASR_REQ,
            SDP_MSG_TYPE.SDP_ASR_RSP,
            SWP_MSG_TYPE.SWP_ASD_REQ,
            SDP_MSG_TYPE.SDP_ASD_RSP,
            SWP_MSG_TYPE.SWP_ASV_REQ,
            SDP_MSG_TYPE.SDP_ASV_RSP,
            SAP_MSG_TYPE.SAP_SRG_REQ,
            SWP_MSG_TYPE.SWP_SRG_REQ,
            SDP_MSG_TYPE.SDP_SRG_RSP,
            SAP_MSG_TYPE.SAP_SAS_REQ,
            SWP_MSG_TYPE.SWP_SAS_REQ,
            SDP_MSG_TYPE.SDP_SAS_RSP,
            SAP_MSG_TYPE.SAP_SDD_REQ,
            SWP_MSG_TYPE.SWP_SDD_RSP,
            SAP_MSG_TYPE.SAP_SLV_REQ,
            SWP_MSG_TYPE.SWP_SLV_REQ,
            SDP_MSG_TYPE.SDP_SLV_RSP,
            SAP_MSG_TYPE.SAP_RAV_REQ,
            SWP_MSG_TYPE.SWP_RAV_REQ,
            SWP_MSG_TYPE.SWP_HAV_REQ,
            SDP_MSG_TYPE.SDP_HAV_RSP,
            SWP_MSG_TYPE.SWP_SHR_REQ,
            SDP_MSG_TYPE.SDP_SHR_RSP,
            SAP_MSG_TYPE.SAP_HHV_REQ,
            SWP_MSG_TYPE.SWP_HHV_REQ,
            SDP_MSG_TYPE.SDP_HHV_RSP,
            SAP_MSG_TYPE.SAP_KAS_REQ,
            SWP_MSG_TYPE.SWP_KAS_REQ
        ],
        HALF_CID_RELEASED_STATE: [
            SDP_MSG_TYPE.SDP_DCD_ACK
        ],
        HALF_IDLE_STATE: [
            SDP_MSG_TYPE.SDP_SGO_ACK,
            SDP_MSG_TYPE.SDP_UDR_RSP
        ]
    }
}
const DATABASE_RECV_MSG_BY_STATE = {
    TSI: {
        IDLE_STATE: [
            SDP_MSG_TYPE.SDP_SIR_REQ
        ]
    },
    SSN: {
        IDLE_STATE: [],
        SSN_INFORMED_STATE: [
            SDP_MSG_TYPE.SDP_DCA_REQ
        ],
        CID_ALLOCATED_STATE: [
            SDP_MSG_TYPE.SDP_RAD_TRN,
            SDP_MSG_TYPE.SDP_DCD_NOT,
            SDP_MSG_TYPE.SDP_DCA_REQ
        ],
        HALF_IDLE_STATE: [
            SDP_MSG_TYPE.SDP_DCA_REQ
        ]
    },
    TCI: {
        IDLE_STATE: [
            SDP_MSG_TYPE.SDP_SGU_REQ
        ],
        UNIQUE_USER_ID_CONFIRMED_STATE: [
            SDP_MSG_TYPE.SDP_SGU_REQ,
            SDP_MSG_TYPE.SDP_UVC_REQ
        ],
        USN_ALLOCATED_STATE: [
            SDP_MSG_TYPE.SDP_UVC_REQ
        ]
    },
    USN: {
        IDLE_STATE: [
            SDP_MSG_TYPE.SDP_SGI_REQ,
            SDP_MSG_TYPE.SDP_FPU_REQ,
            SDP_MSG_TYPE.SDP_SHR_REQ
        ],
        USN_INFORMED_STATE: [
            SDP_MSG_TYPE.SDP_UPC_REQ,
            SDP_MSG_TYPE.SDP_SRG_REQ,
            SDP_MSG_TYPE.SDP_SAS_REQ,
            SDP_MSG_TYPE.SDP_SDD_REQ,
            SDP_MSG_TYPE.SDP_SLV_REQ,
            SDP_MSG_TYPE.SDP_DCA_REQ,
            SDP_MSG_TYPE.SDP_HHV_REQ,
            SDP_MSG_TYPE.SDP_SGI_REQ,
            SDP_MSG_TYPE.SDP_FPU_REQ,
            SDP_MSG_TYPE.SDP_SGI_REQ,
            SDP_MSG_TYPE.SDP_UDR_REQ,
            SDP_MSG_TYPE.SDP_AUV_REQ,
            SDP_MSG_TYPE.SDP_ASR_REQ,
            SDP_MSG_TYPE.SDP_ASD_REQ,
            SDP_MSG_TYPE.SDP_ASV_REQ,
            SDP_MSG_TYPE.SDP_SRG_REQ,
            SDP_MSG_TYPE.SDP_SAS_REQ,
            SDP_MSG_TYPE.SDP_SDD_REQ,
            SDP_MSG_TYPE.SDP_SLV_REQ,
            SDP_MSG_TYPE.SDP_HAV_REQ,
            SDP_MSG_TYPE.SDP_SHR_REQ
        ],
        CID_INFORMED_STATE: [
            SDP_MSG_TYPE.SDP_DCA_REQ,
            SDP_MSG_TYPE.SDP_SGO_NOT,
            SDP_MSG_TYPE.SDP_UPC_REQ,
            SDP_MSG_TYPE.SDP_SRG_REQ,
            SDP_MSG_TYPE.SDP_SAS_REQ,
            SDP_MSG_TYPE.SDP_SDD_REQ,
            SDP_MSG_TYPE.SDP_SLV_REQ,
            SDP_MSG_TYPE.SDP_DCD_NOT,
            SDP_MSG_TYPE.SDP_RHD_TRN,
            SDP_MSG_TYPE.SDP_HHV_REQ,
            SDP_MSG_TYPE.SDP_FPU_REQ,
            SDP_MSG_TYPE.SDP_SGI_REQ
        ],
        CID_RELEASED_STATE: [
            SDP_MSG_TYPE.SDP_DCD_NOT,
            SDP_MSG_TYPE.SDP_SGO_NOT,
            SDP_MSG_TYPE.SDP_FPU_REQ,
            SDP_MSG_TYPE.SDP_SGI_REQ
        ],
        HALF_IDLE_STATE: [
            SDP_MSG_TYPE.SDP_SGO_NOT,
            SDP_MSG_TYPE.SDP_FPU_REQ,
            SDP_MSG_TYPE.SDP_SGI_REQ
        ],
        NULL_STATE: [
            SDP_MSG_TYPE.SDP_SGU_REQ,
            SDP_MSG_TYPE.SDP_SGI_REQ,
            SDP_MSG_TYPE.SDP_SGO_NOT,
            SDP_MSG_TYPE.SDP_UPC_REQ,
            SDP_MSG_TYPE.SDP_FPU_REQ,
            SDP_MSG_TYPE.SDP_UDR_REQ,
            SDP_MSG_TYPE.SDP_AUV_REQ,
            SDP_MSG_TYPE.SDP_ASR_REQ,
            SDP_MSG_TYPE.SDP_ASD_REQ,
            SDP_MSG_TYPE.SDP_ASV_REQ,
            SDP_MSG_TYPE.SDP_SRG_REQ,
            SDP_MSG_TYPE.SDP_SAS_REQ,
            SDP_MSG_TYPE.SDP_SDD_REQ,
            SDP_MSG_TYPE.SDP_SLV_REQ,
            SDP_MSG_TYPE.SDP_DCA_REQ,
            SDP_MSG_TYPE.SDP_DCD_NOT,
            SDP_MSG_TYPE.SDP_HAV_REQ,
            SDP_MSG_TYPE.SDP_SHR_REQ,
            SDP_MSG_TYPE.SDP_HHV_REQ
        ]
    }
}