﻿using System;
using System.ComponentModel.DataAnnotations;

namespace NonFactors.Mvc.Lookup.Tests.Objects
{
    public class TestModel
    {
        public String Id { get; set; }

        [LookupColumn(8)]
        [Display(Name = "Count's value")]
        public Int32 Count { get; set; }

        [LookupColumn]
        public String Value { get; set; }

        [Lookup(typeof(TestLookup<TestModel>))]
        public String ParentId { get; set; }

        [Display(Name = "Date")]
        [LookupColumn(-3, Format = "{0:d}")]
        public DateTime CreationDate { get; set; }

        public String NullableString { get; set; }

        public String RelationId { get; set; }
        public virtual TestRelationModel Relation { get; set; }
    }
}
