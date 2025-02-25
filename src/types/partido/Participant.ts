interface Participant {
    id: number;
    name: string;
    meta: {
        location: "home" | "away";
    };
}
export default Participant;