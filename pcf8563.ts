/**
* makecode PCF8563 RTC Package.
* From microbit/micropython Chinese community.
* http://www.micropython.org.cn
*/

/**
 * PCF8563 block
 */
//% weight=100 color=#A040E0 icon="\uf017" block="PCF8563"
namespace PCF8563 {
    const PCF8563_STAT1_ADDR = 0x0
    const PCF8563_STAT2_ADDR = 0x01
    const PCF8563_SEC_ADDR = 0x02
    const PCF8563_MIN_ADDR = 0x03
    const PCF8563_HR_ADDR = 0x04
    const PCF8563_DAY_ADDR = 0x05
    const PCF8563_WEEKDAY_ADDR = 0x06
    const PCF8563_MONTH_ADDR = 0x07
    const PCF8563_YEAR_ADDR = 0x08
    const PCF8563_ALRM_MIN_ADDR = 0x09
    const PCF8563_SQW_ADDR = 0x0D
    const PCF8563_TIMER1_ADDR = 0x0E
    const PCF8563_TIMER2_ADDR = 0x0F

    const PCF8563_OK = 0x00
    const PCF8563_FAIL = 0x01
    const PCF8563_UNKNOWN_PROTOCOL = 0x11

    class PCF8563I2CMethod {
        address: number
        private i2cwrite(reg: number, value: number) {
            let buf = pins.createBuffer(2);
            buf[0] = reg;
            buf[1] = value;
            let ret = pins.i2cWriteBuffer(this.address, buf);
            return ret;
        }

        private i2cread(reg: number) {
            pins.i2cWriteNumber(this.address, reg, NumberFormat.UInt8BE, true);
            let value = pins.i2cReadNumber(this.address, NumberFormat.UInt8BE);
            return value;
        }

        Set(reg_address: number, value: number): number {
            this.i2cwrite(reg_address, value);
            return PCF8563_OK;
        }

        Get(reg_address: number): number {
            let value = this.i2cread(reg_address);
            return value;
        }
    }

    class PCF8563Method {
        _address: number;
        _stream: PCF8563I2CMethod;

        status1: number;
        status2: number;
        year: number;
        month: number;
        day: number;
        weekday: number;
        hour: number;
        minute: number;
        sec: number;
        century: number;

        constructor(addr: number) {
            this._address = addr;
        }

        Begin(): number {
            this._stream = new PCF8563I2CMethod();
            this._stream.address = this._address;
            this._stream.Set(0x00, 0x00);     //control/status1
            this._stream.Set(0x01, 0x00);     //control/status2
            this._stream.Set(0x02, 0x81);     //set seconds & VL
            this._stream.Set(0x03, 0x01);     //set minutes
            this._stream.Set(0x04, 0x01);     //set hour
            this._stream.Set(0x05, 0x01);     //set day
            this._stream.Set(0x06, 0x01);     //set weekday
            this._stream.Set(0x07, 0x01);     //set month, century to 1
            this._stream.Set(0x08, 0x01);     //set year to 99
            this._stream.Set(0x09, 0x80);     //minute alarm value reset to 00
            this._stream.Set(0x0A, 0x80);     //hour alarm value reset to 00
            this._stream.Set(0x0B, 0x80);     //day alarm value reset to 00
            this._stream.Set(0x0C, 0x80);     //weekday alarm value reset to 00
            this._stream.Set(0x0D, 0x00);     //set SQW, see: setSquareWave
            this._stream.Set(0x0E, 0x00);     //timer off
            return PCF8563_OK;
        }

        getDateTime(){
            let reg_07:number;
            let reg_08:number;
            this.status1 = this._stream.Get(0x00);
            this.status2 = this._stream.Get(0x01);
            this.sec =this.bcdToDec(this._stream.Get(0x02)&~0x80);
            this.minute = this.bcdToDec(this._stream.Get(0x03) & 0x7f);
            this.hour = this.bcdToDec(this._stream.Get(0x04) & 0x3f);
            this.day = this.bcdToDec(this._stream.Get(0x05) & 0x3f);
            this.weekday = this.bcdToDec(this._stream.Get(0x06) & 0x07);
            reg_07 = this._stream.Get(0x07);
            if(reg_07&0x80){
                this.century = 1;
            }else{
                this.century = 0;
            }
            this.month = this.bcdToDec(reg_07&0x1f);
            reg_08 = this._stream.Get(0x08);
            if(this.century == 1){
                this.year = this.bcdToDec(reg_08) + 2000;
            }else{
                this.year = this.bcdToDec(reg_08) + 1900;
            }
        }


        setDateTime(year:number,month:number,day:number,weekday:number,hour:number,minute:number,second:number){
            month = this.decToBcd(month);
            if(year>=2000){
                month &= ~0x80;
                year -= 2000;
            }else{
                month |= 0x80;
                year -= 1900;
            }
            this._stream.Set(0x02, (this.decToBcd(second)&~0x80)); //set sec, clear VL bit
            this._stream.Set(0x02, this.decToBcd(minute));
            this._stream.Set(0x02, this.decToBcd(hour));
            this._stream.Set(0x02, this.decToBcd(day));
            this._stream.Set(0x02, this.decToBcd(weekday));
            this._stream.Set(0x02, this.decToBcd(month));
            this._stream.Set(0x02, this.decToBcd(year));
        }

        setTime(hour:number,minute:number,second:number){
            this.getDateTime();
            this.setDateTime(this.year,this.month,this.day,this.weekday,hour,minute,second);
        }

        setDate(year:number,month:number,day:number){
            let week:number;
            this.getDateTime();
            week = this.whatWeekday(year,month,day);
            this.setDateTime(year, month, day, week, this.hour, this.minute, this.sec);
        }
        
        get(rtc_type:pcf8563_type_e): number{
            this.getDateTime();
            if(rtc_type == 1){
                return this.year;
            }else if(rtc_type == 2){
                return this.month;
            }else if(rtc_type == 3){
                return this.day;
            }else if(rtc_type == 4){
                return this.weekday;
            }else if(rtc_type == 5){
                return this.hour;
            }else if(rtc_type ==6){
                return this.minute
            }else if(rtc_type == 7){
                return this.sec;
            }else{
                return 0;
            }
        }

        decToBcd(val: number): number {
            return ((val/10*16)+(val%10));
        }

        bcdToDec(val: number): number {
            return ((val/16*10)+(val%16));
        }

        whatWeekday(year:number,month:number,day:number){
            let trans:number[] = [0,3,2,5,0,3,5,1,4,6,2,4];
            if(month < 3){
                year = year - 1;
            }
            return ((year + year/4 - year/100 + year/400 + trans[month-1] + day) % 7);
        }
    }
    let pHaodaPCF8563: PCF8563Method = null;
	
    //% blockId="PCF8563_Begin" block="PCF8563 initialize |%addr"
    //% weight=43 blockGap=8
    //% parts="PCF8563"
    export function Begin(addr: number) {
        if (pHaodaPCF8563 == null) {
            pHaodaPCF8563 = new PCF8563Method(addr)
            pHaodaPCF8563.Begin();
        }
    }
	
    //% blockId="PCF8563_setTime" block="PCF8563 set Time|Hour %hour|Minute %minute|Second %second"
    //% weight=43 blockGap=8
    //% parts="PCF8563"
    export function setTime(hour:number,minute:number,second:number){
	pHaodaPCF8563.setTime(hour,minute,second);
    }
	
    //% blockId="PCF8563_setDate" block="PCF8563 set Date|Year %year|Month %month|Day %day"
    //% weight=43 blockGap=8
    //% parts="PCF8563"
    export function setDate(year:number,month:number,day:number){
	pHaodaPCF8563.setDate(year,month,day);
    }

    //% blockId="PCF8563_get" block="PCF8563 get|%rtc_type"
    //% weight=43 blockGap=8
    //% parts="PCF8563"
    export function get(rtc_type:pcf8563_type_e): number{
	return pHaodaPCF8563.get(rtc_type);
    }
}




