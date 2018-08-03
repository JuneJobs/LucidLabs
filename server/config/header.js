
const HEADER_SIZE = 6;

const INVALID_ID_TYPE = 07

/** Protocol message endpoint id type define
 * Define 01 ~ 06
 * Reserved 07 ~ 0f
 */
const ENDPOIONT_ID_TYPE = {
    EI_TYPE_SENSOR_TSI: 01,
    EI_TYPE_APP_TCI: 02,
    EI_TYPE_WEB_TCI: 03,
    EI_TYPE_SENSOR_SSN: 04,
    EI_TYPE_APP_USN: 05,
    EI_TYPE_WEB_USN: 06,
}


const INVALID_MSG_TYPE = 0xff;

/** SSP protocol message type define
 *  Define 0x01 (1) ~ 0x08 (8)
 *  Reserved 0x09 (9) ~ 0x1e (30)
 */
const SSP_MSG_TYPE = {
    SSP_SIR_REQ: 0x01,
    SSP_SIR_RSP: 0x02,
    SSP_DCA_REQ: 0x03,
    SSP_DCA_RSP: 0x04,
    SSP_DCD_REQ: 0x05,
    SSP_DCD_RSP: 0x06,
    SSP_RAD_TRN: 0x07,
    SSP_RAD_ACK: 0x08
};
/** SAP protocol message type define
 *  Define 0x1f (31) ~ 0x44 (62)
 *  Reserved 0x3f (63) ~ 0x64 (100)
 */
const SAP_MSG_TYPE = {
    SAP_SGU_REQ: 0x1f,
    SAP_SGU_RSP: 0x20,
    SAP_UVC_REQ: 0x21,
    SAP_UVC_RSP: 0x22,
    SAP_SGI_REQ: 0x23,
    SAP_SGI_RSO: 0x24,
    SAP_SGO_NOT: 0x25,
    SAP_SGO_ACK: 0x26,
    SAP_UPC_REQ: 0x27,
    SAP_UPC_RSP: 0x28,
    SAP_FPU_REQ: 0x29,
    SAP_FPU_RSP: 0x2a,
    SAP_SRG_REQ: 0x2b,
    SAP_SRG_RSP: 0x2c,
    SAP_SAS_REQ: 0x2d,
    SAP_SAS_RSP: 0x2e,
    SAP_SDD_REQ: 0x2f,
    SAP_SDD_RSP: 0x30,
    SAP_SLV_REQ: 0x31,
    SAP_SLV_RSP: 0x32,
    SAP_DCA_REQ: 0x33,
    SAP_DCA_RSP: 0x34,
    SAP_DCD_NOT: 0x35,
    SAP_DCD_ACK: 0x36,
    SAP_RHD_TRN: 0x37,
    SAP_RHD_ACK: 0x38,
    SAP_RAV_REQ: 0x39,
    SAP_RAV_RSP: 0x40,
    SAP_HHV_REQ: 0x41,
    SAP_HHV_RSP: 0x42,
    SAP_KAS_REQ: 0x43,
    SAP_KAS_RSP: 0x44
};
/** SWP protocol message type define
 *  Define 0x65 (101) ~ 0x8e (142)
 *  Reserved 0x8f (143) ~ 0xaa (170)
 */
const SWP_MSG_TYPE = {
    SWP_SGU_REQ: 0x65,
    SWP_SGU_RSP: 0x66,
    SWP_UVC_REQ: 0x67,
    SWP_UVC_RSP: 0x68,
    SWP_SGI_REQ: 0x69,
    SWP_SGI_RSP: 0x6a,
    SWP_SGO_NOT: 0x6b,
    SWP_SGO_ACK: 0x6c,
    SWP_UPC_REQ: 0x6d,
    SWP_UPC_RSP: 0x6e,
    SWP_FPU_REQ: 0x6f,
    SWP_FPU_RSP: 0x70,
    SWP_UDR_REQ: 0x71,
    SWP_UDR_RSP: 0x72,
    SWP_AUV_REQ: 0x73,
    SWP_AUV_RSP: 0x74,
    SWP_ASR_REQ: 0x75,
    SWP_ASR_RSP: 0x76,
    SWP_ASD_REQ: 0x77,
    SWP_ASD_RSP: 0x78,
    SWP_ASV_REQ: 0x79,
    SWP_ASV_RSP: 0x7a,
    SWP_SRG_REQ: 0x7b,
    SWP_SRG_RSP: 0x7c,
    SWP_SAS_REQ: 0x7d,
    SWP_SAS_RSP: 0x7e,
    SWP_SDD_REQ: 0x7f,
    SWP_SDD_RSP: 0x80,
    SWP_SLV_REQ: 0x81,
    SWP_SLV_RSP: 0x82,
    SWP_RAV_REQ: 0x83,
    SWP_RAV_RSP: 0x84,
    SWP_RHV_REQ: 0x85,
    SWP_RHV_RSP: 0x86,
    SWP_HAV_REQ: 0x87,
    SWP_HAV_RSP: 0x88,
    SWP_SHR_REQ: 0x89,
    SWP_SHR_RSP: 0x8a,
    SWP_HHV_REQ: 0x8b,
    SWP_HHV_RSP: 0x8c,
    SWP_KAS_REQ: 0x8d,
    SWP_KAS_RSP: 0x8e
};
/** SDP protocol message type define
 *  Define 0xab (171) ~ 0xd8 (216)
 *  Reserved 0xd9 (217) ~ 0xfe (254)
 */
const SDP_MSG_TYPE = {
    SDP_SGU_REQ: 0xab,
    SDP_SGU_RSP: 0xac,
    SDP_UVC_REQ: 0xad,
    SDP_UVC_RSP: 0xae,
    SDP_SGI_REQ: 0xaf,
    SDP_SGI_RSP: 0xb0,
    SDP_SGO_NOT: 0xb1,
    SDP_SGO_ACK: 0xb2,
    SDP_UPC_REQ: 0xb3,
    SDP_UPC_RSP: 0xb4,
    SDP_FPU_REQ: 0xb5,
    SDP_FPU_RSP: 0xb6,
    SDP_UDR_REQ: 0xb7,
    SDP_UDR_RSP: 0xb8,
    SDP_AUV_REQ: 0xb9,
    SDP_AUV_RSP: 0xba,
    SDP_ASR_REQ: 0xbb,
    SDP_ASR_RSP: 0xbc,
    SDP_ASD_REQ: 0xbd,
    SDP_ASD_RSP: 0xbe,
    SDP_ASV_REQ: 0xbf,
    SDP_ASV_RSP: 0xc0,
    SDP_SRG_REQ: 0xc1,
    SDP_SRG_RSP: 0xc2,
    SDP_SAS_REQ: 0xc3,
    SDP_SAS_RSP: 0xc4,
    SDP_SDD_REQ: 0xc5,
    SDP_SDD_RSP: 0xc6,
    SDP_SLV_REQ: 0xc7,
    SDP_SLV_RSP: 0xc8,
    SDP_SIR_REQ: 0xc9,
    SDP_SIR_RSP: 0xca,
    SDP_DCA_REQ: 0xcb,
    SDP_DCA_RSP: 0xcc,
    SDP_DCD_NOT: 0xcd,
    SDP_DCD_ACK: 0xce,
    SDP_RAD_TRN: 0xcf,
    SDP_RAD_ACK: 0xd0,
    SDP_RHD_TRN: 0xd1,
    SDP_RHD_ACK: 0xd2,
    SDP_HAV_REQ: 0xd3,
    SDP_HAV_RSP: 0xd4,
    SDP_SHR_REQ: 0xd5,
    SDP_SHR_RSP: 0xd6,
    SDP_HHV_REQ: 0xd7,
    SDP_HHV_RSP: 0xd8
}

module.exports = { HEADER_SIZE, 
                   INVALID_ID_TYPE, 
                   ENDPOIONT_ID_TYPE, 
                   INVALID_MSG_TYPE, 
                   SSP_MSG_TYPE, 
                   SAP_MSG_TYPE,
                   SWP_MSG_TYPE, 
                   SDP_MSG_TYPE }