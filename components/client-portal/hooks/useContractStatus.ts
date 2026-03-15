import { Client } from '../../../types';

export function useContractStatus(client: Client) {
    const getActiveContractData = () => {
        const today = new Date();
        const program = (client.program || {}) as any;

        const contracts = [
            {
                phase: 'F1',
                startDate: client.start_date,
                endDate: program.f1_endDate,
                duration: client.program_duration_months || 0,
                name: program.contract1_name || `${client.program_duration_months || 3} meses`,
                isRenewed: true
            },
            {
                phase: 'F2',
                startDate: program.f2_renewalDate,
                endDate: program.f2_endDate,
                duration: program.f2_duration || 0,
                name: program.contract2_name || `${program.f2_duration || 0} meses`,
                isRenewed: program.renewal_f2_contracted
            },
            {
                phase: 'F3',
                startDate: program.f3_renewalDate,
                endDate: program.f3_endDate,
                duration: program.f3_duration || 0,
                name: program.contract3_name || `${program.f3_duration || 0} meses`,
                isRenewed: program.renewal_f3_contracted
            },
            {
                phase: 'F4',
                startDate: program.f4_renewalDate,
                endDate: program.f4_endDate,
                duration: program.f4_duration || 0,
                name: program.contract4_name || `${program.f4_duration || 0} meses`,
                isRenewed: program.renewal_f4_contracted
            },
            {
                phase: 'F5',
                startDate: program.f5_renewalDate,
                endDate: program.f5_endDate,
                duration: program.f5_duration || 0,
                name: program.contract5_name || `${program.f5_duration || 0} meses`,
                isRenewed: program.renewal_f5_contracted
            }
        ];

        const activeContracts = contracts.filter(contract =>
            contract.isRenewed &&
            contract.startDate &&
            contract.endDate &&
            !isNaN(new Date(contract.startDate).getTime()) &&
            !isNaN(new Date(contract.endDate).getTime())
        );

        if (activeContracts.length === 0) {
            return {
                phase: 'F1',
                startDate: client.start_date,
                endDate: client.contract_end_date,
                duration: client.program_duration_months || 0,
                name: `${client.program_duration_months || 3} Meses`
            };
        }

        const currentContract = activeContracts.find(contract => {
            const start = new Date(contract.startDate);
            const end = new Date(contract.endDate);
            return today >= start && today <= end;
        });

        const activeContract = currentContract || activeContracts[activeContracts.length - 1];

        return {
            phase: activeContract.phase,
            startDate: activeContract.startDate,
            endDate: activeContract.endDate,
            duration: activeContract.duration,
            name: `${activeContract.duration} Meses`
        };
    };

    const activeContract = getActiveContractData();

    const getCurrentPhaseDaysRemaining = () => {
        const today = new Date();
        const c = client as any;
        const phases = [
            { name: 'F1', date: c.f1_endDate },
            { name: 'F2', date: c.f2_endDate },
            { name: 'F3', date: c.f3_endDate },
            { name: 'F4', date: c.f4_endDate },
            { name: 'F5', date: c.f5_endDate },
            { name: 'Fin Contrato', date: client.contract_end_date }
        ];

        const validDates = phases
            .filter(p => p.date)
            .map(p => ({ ...p, dateObj: new Date(p.date) }))
            .filter(d => !isNaN(d.dateObj.getTime()))
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        if (validDates.length === 0) return null;

        const nextTarget = validDates.find(d => d.dateObj.getTime() >= today.getTime() - (24 * 60 * 60 * 1000));
        const target = nextTarget || validDates[validDates.length - 1];

        const diffTime = target.dateObj.getTime() - today.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { days, phaseName: target.name, date: target.dateObj };
    };

    const contractStatus = getCurrentPhaseDaysRemaining();
    const daysRemaining = contractStatus?.days ?? null;
    const isUrgent = daysRemaining !== null && daysRemaining <= 15;

    const getProgramWeek = () => {
        if (!activeContract.startDate || !activeContract.duration) return null;
        const startDate = new Date(activeContract.startDate);
        const today = new Date();
        const diffTime = today.getTime() - startDate.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        const totalWeeks = activeContract.duration * 4;
        return { current: Math.min(diffWeeks, totalWeeks), total: totalWeeks };
    };

    const programWeek = getProgramWeek();

    return {
        activeContract,
        contractStatus,
        daysRemaining,
        isUrgent,
        programWeek,
    };
}
